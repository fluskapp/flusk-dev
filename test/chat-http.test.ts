import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { afterAll, beforeAll, expect, it } from "vitest";
import { streamHttp } from "../src/chat/http-backend.js";
import type { ChatChunk } from "../src/chat/types.js";
import type { ChatBackendConfig } from "../src/config/types.js";

let server: Server;
let base: string;
let seen: { auth?: string | undefined; body: string; url?: string | undefined } = { body: "" };

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const delta = (text: string) => sse({ choices: [{ delta: { content: text } }] });

function backend(path: string, apiKeyEnv?: string): ChatBackendConfig {
	return {
		id: "test",
		kind: "openai-compatible",
		baseUrl: `${base}${path}`,
		model: "test-model",
		...(apiKeyEnv !== undefined ? { apiKeyEnv } : {}),
	};
}

async function collect(cfg: ChatBackendConfig, signal?: AbortSignal): Promise<ChatChunk[]> {
	const chunks: ChatChunk[] = [];
	const ac = new AbortController();
	const msgs = [{ role: "user" as const, content: "hi" }];
	for await (const c of streamHttp(cfg, msgs, signal ?? ac.signal)) chunks.push(c);
	return chunks;
}

function route(req: IncomingMessage, res: ServerResponse, body: string): void {
	seen = { auth: req.headers.authorization, body, url: req.url };
	if (req.url === "/boom/chat/completions") {
		res.writeHead(500, { "content-type": "text/plain" });
		res.end("upstream exploded");
		return;
	}
	res.writeHead(200, { "content-type": "text/event-stream" });
	if (req.url === "/ok/chat/completions") {
		res.write(": keep-alive comment\n\n");
		res.write(delta("Hel"));
		res.write(`${delta("lo")}data: {"choices":[{"delta":{}}]}\n\n`);
		res.end('data: [DONE]\n\ndata: {"choices":[{"delta":{"content":"after"}}]}\n\n');
		return;
	}
	// malformed: one good delta, then a line that is not JSON
	res.end(`${delta("a")}data: {oops\n\n${delta("never")}`);
}

beforeAll(async () => {
	server = createServer((req, res) => {
		let body = "";
		req.on("data", (b: Buffer) => {
			body += b.toString("utf8");
		});
		req.on("end", () => route(req, res, body));
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const addr = server.address();
	base = `http://127.0.0.1:${typeof addr === "object" && addr !== null ? addr.port : 0}`;
});

afterAll(async () => {
	await new Promise<void>((r) => server.close(() => r()));
	delete process.env.AH_CHAT_HTTP_KEY;
});

it("posts /chat/completions and yields deltas until [DONE]", async () => {
	process.env.AH_CHAT_HTTP_KEY = "sk-live";
	const chunks = await collect(backend("/ok", "AH_CHAT_HTTP_KEY"));
	expect(chunks).toEqual([
		{ type: "delta", text: "Hel" },
		{ type: "delta", text: "lo" },
	]);
	expect(seen.url).toBe("/ok/chat/completions");
	expect(seen.auth).toBe("Bearer sk-live");
	expect(JSON.parse(seen.body)).toEqual({
		model: "test-model",
		messages: [{ role: "user", content: "hi" }],
		stream: true,
	});
});

it("omits Authorization when the backend is keyless, and trims a trailing slash", async () => {
	const chunks = await collect(backend("/ok/"));
	expect(chunks).toHaveLength(2);
	expect(seen.url).toBe("/ok/chat/completions");
	expect(seen.auth).toBeUndefined();
});

it("turns a 500 into an error chunk carrying the body", async () => {
	const chunks = await collect(backend("/boom"));
	expect(chunks).toHaveLength(1);
	expect(chunks[0]?.type).toBe("error");
	expect((chunks[0] as { message: string }).message).toContain("HTTP 500");
	expect((chunks[0] as { message: string }).message).toContain("upstream exploded");
});

it("turns a malformed SSE payload into an error chunk after the good deltas", async () => {
	const chunks = await collect(backend("/malformed"));
	expect(chunks[0]).toEqual({ type: "delta", text: "a" });
	expect(chunks[1]?.type).toBe("error");
	expect((chunks[1] as { message: string }).message).toContain("malformed SSE payload");
	expect(chunks).toHaveLength(2); // nothing after the failure
});

it("reports a dead endpoint as an error chunk, never a throw", async () => {
	const chunks = await collect({
		id: "dead",
		kind: "openai-compatible",
		baseUrl: "http://127.0.0.1:1/v1",
		model: "x",
	});
	expect(chunks).toHaveLength(1);
	expect(chunks[0]?.type).toBe("error");
});

it("stays silent when the caller aborts", async () => {
	const ac = new AbortController();
	ac.abort();
	expect(await collect(backend("/ok"), ac.signal)).toEqual([]);
});
