/**
 * POST /api/ask over a real socket, against a local stub endpoint — no CLI is
 * ever spawned and nothing leaves the loopback interface.
 *
 * The assertion this file exists for is the VISIBLE-CONTEXT GUARANTEE: the
 * first frame of the stream is the literal prompt the model received, and it
 * must be exactly the blocks the panel posted plus the question. That is what
 * makes an auto-attached context debuggable — if the prompt could contain
 * anything the panel did not show, the whole feature is a black box.
 *
 * The refusal path carries the same frame: asking an unavailable answerer
 * still returns the prompt, then the reason that answerer was disabled with.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { type ChatStub, startChatStub } from "./api-chat-stub.js";
import { post, sseChunks } from "./api-http.js";
import { type Tree, tree } from "./project-fixture.js";

let t: Tree;
let ui: UiServer;
let stub: ChatStub;

const BLOCKS = [
	{ id: "symbol", label: "symbol greet", text: "function greet(who: string): string" },
	{ id: "blast", label: "blast radius", text: "- use.ts (file) src/use.ts — depth 1" },
];

beforeAll(async () => {
	t = tree();
	stub = await startChatStub();
	writeFileSync(
		join(t.home, "config.json"),
		JSON.stringify({
			ui: t.cfg.ui,
			memory: { enabled: false },
			chat: {
				backends: [
					{
						id: "stub",
						label: "Stub",
						kind: "openai-compatible",
						baseUrl: `${stub.url}/fast`,
						model: "m",
					},
					{ id: "half", label: "Half", kind: "openai-compatible", model: "m" },
				],
			},
		}),
	);
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	await stub.close();
	t.cleanup();
});

const ask = (body: unknown) => post(ui.url, "/api/ask", body);

it("streams the exact prompt first, then the answer", async () => {
	const res = await ask({
		answererId: "backend:stub",
		question: "what breaks if I change this?",
		blocks: BLOCKS,
	});
	expect(res.status).toBe(200);
	const chunks = sseChunks(res.body) as Array<{ type: string; text?: string; message?: string }>;
	expect(chunks[0]?.type).toBe("prompt");
	expect(chunks.slice(1)).toEqual([
		{ type: "delta", text: "hello " },
		{ type: "delta", text: "world" },
		{ type: "done" },
	]);
	const prompt = chunks[0]?.text ?? "";
	// Everything the panel showed is in it...
	for (const b of BLOCKS) {
		expect(prompt).toContain(b.text);
		expect(prompt).toContain(`<context label="${b.label}">`);
	}
	expect(prompt).toContain("what breaks if I change this?");
	// ...and nothing else is: strip what was on screen and only the fence and
	// the one instruction line remain.
	let rest = prompt;
	for (const part of [...BLOCKS.map((b) => b.text), "what breaks if I change this?"]) {
		rest = rest.replace(part, "");
	}
	expect(rest).not.toMatch(/[a-z]{4,}\.ts/);
	expect(rest.length).toBeLessThan(prompt.length - 60);
});

it("shows an unavailable answerer's reason instead of a spawn failure", async () => {
	const res = await ask({ answererId: "backend:half", question: "why?", blocks: [] });
	const chunks = sseChunks(res.body) as Array<{ type: string; message?: string }>;
	expect(chunks[0]?.type).toBe("prompt");
	expect(chunks.slice(1)).toEqual([{ type: "error", message: "set baseUrl" }, { type: "done" }]);
});

it("reports an unknown answerer as an error chunk, not an HTTP failure", async () => {
	const res = await ask({ answererId: "agent:nobody", question: "why?", blocks: [] });
	expect(res.status).toBe(200);
	const chunks = sseChunks(res.body) as Array<{ type: string; message?: string }>;
	expect(chunks.slice(1)).toEqual([
		{ type: "error", message: "unknown answerer: agent:nobody" },
		{ type: "done" },
	]);
});

it("refuses a question with no text, and a cwd that is not a known project", async () => {
	expect((await ask({ answererId: "backend:stub", question: "  " })).status).toBe(400);
	const bad = await ask({ answererId: "backend:stub", question: "hi", cwd: "/etc" });
	expect(bad.status).toBe(400);
	expect(JSON.parse(bad.body)).toMatchObject({ error: "cwd must be a known project path" });
});

it("attaches nothing when nothing was posted, and says so in the prompt", async () => {
	const res = await ask({ answererId: "backend:stub", question: "hello?" });
	const chunks = sseChunks(res.body) as Array<{ type: string; text?: string }>;
	expect(chunks[0]?.text).toContain("No context was attached");
	expect(chunks[0]?.text).not.toContain("<context");
});
