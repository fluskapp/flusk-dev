import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createChatEngine } from "../src/chat/engine.js";
import type { ChatChunk, ChatRequest } from "../src/chat/types.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { AhConfig, ChatBackendConfig } from "../src/config/types.js";

let bin: string;
let realPath: string | undefined;

const cfg = (backends: ChatBackendConfig[]): AhConfig => ({
	...DEFAULT_CONFIG,
	chat: { backends },
});
const ask = (backendId: string): ChatRequest => ({
	backendId,
	messages: [{ role: "user", content: "hi" }],
});

async function run(
	backends: ChatBackendConfig[],
	req: ChatRequest,
	ac = new AbortController(),
): Promise<ChatChunk[]> {
	const chunks: ChatChunk[] = [];
	for await (const c of createChatEngine(cfg(backends)).stream(req, ac.signal)) chunks.push(c);
	return chunks;
}

function script(name: string, body: string): void {
	const path = join(bin, name);
	writeFileSync(path, `#!/bin/sh\n${body}`);
	chmodSync(path, 0o755);
}

const dones = (chunks: ChatChunk[]) => chunks.filter((c) => c.type === "done").length;

beforeAll(() => {
	bin = mkdtempSync(join(tmpdir(), "ah-chat-engine-"));
	realPath = process.env.PATH;
	process.env.PATH = bin;
	script("mycli", `printf 'answer to: %s' "$2"\n`);
	script("badcli", `echo 'no auth' >&2\nexit 7\n`);
	script("slowcli", `printf 'start'\nsleep 5\n`);
});

afterAll(() => {
	if (realPath === undefined) delete process.env.PATH;
	else process.env.PATH = realPath;
	rmSync(bin, { recursive: true, force: true });
});

it("list() merges detected CLIs with configured backends", async () => {
	const engine = createChatEngine(
		cfg([{ id: "ollama", kind: "openai-compatible", baseUrl: "http://127.0.0.1:11434/v1" }]),
	);
	const list = await engine.list();
	expect(list.map((b) => b.id)).toEqual(["claude", "codex", "kimi", "ollama"]);
	expect(list[0]).toMatchObject({ available: false, note: "claude not found on PATH" });
	expect(list.at(-1)).toMatchObject({ kind: "openai-compatible", available: true });
});

it("streams a CLI backend and ends with exactly one done", async () => {
	const chunks = await run(
		[{ id: "mine", kind: "cli", command: "mycli", args: ["-p"] }],
		ask("mine"),
	);
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe(
		"answer to: User: hi",
	);
	expect(dones(chunks)).toBe(1);
	expect(chunks.at(-1)).toEqual({ type: "done" });
});

it("an unknown backend id is an error chunk plus one done", async () => {
	const chunks = await run([], ask("nope"));
	expect(chunks).toEqual([
		{ type: "error", message: "unknown chat backend: nope" },
		{ type: "done" },
	]);
});

it("an unavailable backend reports its note instead of failing obscurely", async () => {
	const chunks = await run(
		[{ id: "or", kind: "openai-compatible", baseUrl: "https://x/v1", apiKeyEnv: "AH_MISSING_KEY" }],
		ask("or"),
	);
	expect(chunks).toEqual([{ type: "error", message: "set AH_MISSING_KEY" }, { type: "done" }]);
});

it("a failing CLI still ends with exactly one done", async () => {
	const chunks = await run([{ id: "bad", kind: "cli", command: "badcli" }], ask("bad"));
	expect(dones(chunks)).toBe(1);
	expect(chunks[0]?.type).toBe("error");
	expect((chunks[0] as { message: string }).message).toContain("no auth");
});

it("pi-ai backends are reported, not silently ignored", async () => {
	process.env.ANTHROPIC_API_KEY = "sk-test";
	const chunks = await run([{ id: "pi", kind: "pi-ai", model: "anthropic/x" }], ask("pi"));
	delete process.env.ANTHROPIC_API_KEY;
	expect(dones(chunks)).toBe(1);
	expect((chunks[0] as { message: string }).message).toContain("pi-ai chat is not wired yet");
});

it("abort mid-stream still terminates with one done", async () => {
	const ac = new AbortController();
	const chunks: ChatChunk[] = [];
	const engine = createChatEngine(cfg([{ id: "slow", kind: "cli", command: "slowcli" }]));
	for await (const c of engine.stream(ask("slow"), ac.signal)) {
		chunks.push(c);
		if (c.type === "delta") ac.abort();
	}
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("start");
	expect(dones(chunks)).toBe(1);
	expect(chunks.at(-1)).toEqual({ type: "done" });
});
