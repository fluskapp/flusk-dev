/**
 * persistedStream, driven by hand-built chunk generators — no engine, no
 * spawn, no network. FLUSK_HOME points at a tempdir.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { readConversation } from "../src/features/chat/chat-log.repository.js";
import { persistedStream } from "../src/features/chat/chat-persist.js";
import type { ChatChunk, ChatRequest } from "../src/features/chat/types.js";

let home: string;
let realHome: string | undefined;

beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-chat-persist-"));
	realHome = process.env.FLUSK_HOME;
	process.env.FLUSK_HOME = home;
});

afterAll(() => {
	if (realHome === undefined) delete process.env.FLUSK_HOME;
	else process.env.FLUSK_HOME = realHome;
	rmSync(home, { recursive: true, force: true });
});

const req = (conversationId?: string): ChatRequest => ({
	backendId: "claude",
	messages: [{ role: "user", content: "hi" }],
	cwd: "/w",
	...(conversationId === undefined ? {} : { conversationId }),
});

async function* gen(chunks: ChatChunk[]): AsyncGenerator<ChatChunk> {
	yield* chunks;
}

async function drain(stream: AsyncGenerator<ChatChunk>): Promise<ChatChunk[]> {
	const out: ChatChunk[] = [];
	for await (const c of stream) out.push(c);
	return out;
}

const convId = (chunks: ChatChunk[]): string =>
	chunks[0]?.type === "meta" ? chunks[0].conversationId : "";

it("emits meta first with a fresh id and passes every chunk through", async () => {
	const source: ChatChunk[] = [
		{ type: "delta", text: "a" },
		{ type: "tool", label: "Read x" },
		{ type: "delta", text: "b" },
		{ type: "done" },
	];
	const chunks = await drain(persistedStream(req(), gen(source)));
	expect(chunks[0]?.type).toBe("meta");
	expect(convId(chunks)).toMatch(/^[A-Za-z0-9_-]{1,80}$/);
	expect(chunks.slice(1)).toEqual(source);
});

it("appends the user turn before the first chunk is even pulled", async () => {
	const stream = persistedStream(req(), gen([{ type: "delta", text: "x" }, { type: "done" }]));
	const first = await stream.next();
	expect(first.value).toMatchObject({ type: "meta" });
	const id = (first.value as { conversationId: string }).conversationId;
	expect(readConversation(id).turns).toEqual([
		{ role: "user", content: "hi", at: expect.any(String), backendId: "claude", cwd: "/w" },
	]);
	await drain(stream);
	expect(readConversation(id).turns).toEqual([
		expect.objectContaining({ role: "user" }),
		expect.objectContaining({ role: "assistant", content: "x" }),
	]);
	expect(readConversation(id).turns[1]?.partial).toBeUndefined();
});

it("an error mid-stream persists the partial text, then the error line", async () => {
	const chunks = await drain(
		persistedStream(
			req(),
			gen([{ type: "delta", text: "half" }, { type: "error", message: "boom" }, { type: "done" }]),
		),
	);
	const { turns } = readConversation(convId(chunks));
	expect(turns).toHaveLength(3);
	expect(turns[1]).toMatchObject({ role: "assistant", content: "half", partial: true });
	expect(turns[2]).toMatchObject({ role: "assistant", content: "boom", err: true });
});

it("a disconnect (generator return) persists what arrived, marked partial", async () => {
	const stream = persistedStream(req(), gen([{ type: "delta", text: "so far" }, { type: "done" }]));
	const meta = await stream.next();
	const id = (meta.value as { conversationId: string }).conversationId;
	await stream.next(); // the delta
	await stream.return(undefined);
	const { turns } = readConversation(id);
	expect(turns).toHaveLength(2);
	expect(turns[1]).toEqual({
		role: "assistant",
		content: "so far",
		at: expect.any(String),
		partial: true,
	});
});

it("persists the invocation, tool lines, and stats on the closing turn", async () => {
	const source: ChatChunk[] = [
		{ type: "cmd", line: "claude -p <prompt>", cwd: "/w" },
		{ type: "tool", label: "Read a.ts" },
		{ type: "delta", text: "ok" },
		{ type: "tool", label: "Bash ls" },
		{ type: "stats", costUsd: 0.02, durationMs: 5394, turns: 2 },
		{ type: "done" },
	];
	const chunks = await drain(persistedStream(req(), gen(source)));
	expect(chunks.slice(1)).toEqual(source); // mechanics pass through unchanged
	const { turns } = readConversation(convId(chunks));
	expect(turns[1]).toMatchObject({
		role: "assistant", content: "ok", cmd: "claude -p <prompt>", cwd: "/w",
		tools: ["Read a.ts", "Bash ls"], costUsd: 0.02, durationMs: 5394, turns: 2,
	});
});

it("an errored reply carries its mechanics on the err line", async () => {
	const source: ChatChunk[] = [
		{ type: "cmd", line: "claude -p <prompt>", cwd: "/w" },
		{ type: "error", message: "boom" },
		{ type: "done" },
	];
	const chunks = await drain(persistedStream(req(), gen(source)));
	const { turns } = readConversation(convId(chunks));
	expect(turns[1]).toMatchObject({ err: true, content: "boom", cmd: "claude -p <prompt>" });
});

it("a second request with the same conversationId appends to the same file", async () => {
	const first = await drain(
		persistedStream(req(), gen([{ type: "delta", text: "one" }, { type: "done" }])),
	);
	const id = convId(first);
	await drain(persistedStream(req(id), gen([{ type: "delta", text: "two" }, { type: "done" }])));
	expect(readConversation(id).turns.map((t) => t.content)).toEqual(["hi", "one", "hi", "two"]);
});
