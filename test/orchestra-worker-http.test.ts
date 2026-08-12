import { realpathSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { join } from "node:path";
import { Type } from "typebox";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { FluskConfig } from "../src/config/types.js";
import { httpWorker } from "../src/orchestra/worker-http.js";
import { FakeProvider } from "../src/provider/fake.js";
import type { Tool } from "../src/tools/tool.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";
import { cfgWith, initRepo, makeCtx, makeSpec, makeTask } from "./orchestra-fixture.js";

/** No network beyond loopback: a local server stands in for Ollama/vLLM. */
let server: Server;
let repo: string;
let cfg: FluskConfig;
const bodies: string[] = [];

const sse = (o: unknown) => `data: ${JSON.stringify(o)}\n\n`;
const delta = (d: unknown) => sse({ choices: [{ delta: d }] });

function reply(res: ServerResponse): void {
	res.writeHead(200, { "content-type": "text/event-stream" });
	if (bodies.length === 1) {
		// Arguments arrive split across chunks, and only the first fragment
		// carries the id and the name.
		res.write(
			delta({
				tool_calls: [{ index: 0, id: "c1", function: { name: "scribble", arguments: '{"pa' } }],
			}),
		);
		res.write(delta({ tool_calls: [{ index: 0, function: { arguments: 'th":"made.txt"}' } }] }));
		res.end("data: [DONE]\n\n");
		return;
	}
	res.write(delta({ content: "I changed nothing." }));
	res.end("data: [DONE]\n\n");
}

beforeAll(async () => {
	repo = realpathSync(await setupTestHome("flusk-orch-http-"));
	initRepo(repo);
	server = createServer((req: IncomingMessage, res: ServerResponse) => {
		let body = "";
		req.on("data", (b: Buffer) => {
			body += b.toString("utf8");
		});
		req.on("end", () => {
			bodies.push(body);
			reply(res);
		});
	});
	await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
	const addr = server.address();
	const port = typeof addr === "object" && addr !== null ? addr.port : 0;
	cfg = cfgWith([
		{ id: "local", kind: "openai-compatible", baseUrl: `http://127.0.0.1:${port}/v1`, model: "m" },
		{ id: "shell", kind: "cli", command: "flusk-no-such-cli-91aa", args: [] },
	]);
});

afterAll(async () => {
	teardownTestHome();
	await new Promise<void>((r) => server.close(() => r()));
});

const scribble: Tool = {
	name: "scribble",
	description: "writes a file",
	parameters: Type.Object({ path: Type.String() }),
	mode: "sequential",
	execute: async (args) => {
		writeFileSync(join(repo, (args as { path: string }).path), "written\n");
		return { output: "ok" };
	},
};

it("checks the backend without making a billable call", async () => {
	const worker = httpWorker(cfg, makeCtx(repo, new FakeProvider([]), []));
	expect(
		await worker.available(makeSpec({ name: "a", worker: "http", backendId: "local" })),
	).toEqual({ ok: true });
	// A CLI backend cannot drive an http worker, whatever the spec says.
	expect(
		await worker.available(makeSpec({ name: "b", worker: "http", backendId: "shell" })),
	).toMatchObject({ ok: false });
	// An id the user never configured never falls back to the configured one.
	expect(
		await worker.available(makeSpec({ name: "c", worker: "http", backendId: "elsewhere" })),
	).toMatchObject({ ok: false, reason: 'backend "elsewhere" is not configured' });
	expect(bodies).toHaveLength(0); // probing spawned and requested nothing
});

it("drives flusk's own tool loop over the endpoint and observes what it changed", async () => {
	const worker = httpWorker(cfg, makeCtx(repo, new FakeProvider([]), [scribble]));
	const spec = makeSpec({ name: "local-coder", worker: "http", backendId: "local", model: "qwen" });
	const result = await worker.run(
		makeTask(spec, "make a file", repo, new AbortController().signal),
	);

	expect(result.ok).toBe(true);
	expect(result.summary).toBe("I changed nothing.");
	// Observed, not parroted.
	expect(result.filesTouched).toEqual([join(repo, "made.txt")]);
	expect(result.costUsd).toBeUndefined(); // unmetered endpoint: unknown, not 0

	const first = JSON.parse(bodies[0] ?? "{}") as {
		model: string;
		tools: Array<{ function: { name: string } }>;
	};
	expect(first.model).toBe("qwen"); // the spec's override, not the backend default
	expect(first.tools.map((t) => t.function.name)).toContain("scribble");
	// The tool result went back as a tool-role message keyed by call id.
	const second = JSON.parse(bodies[1] ?? "{}") as {
		messages: Array<{ role: string; content: string; tool_call_id?: string }>;
	};
	expect(second.messages.at(-1)).toMatchObject({ role: "tool", tool_call_id: "c1", content: "ok" });
});
