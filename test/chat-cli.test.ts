import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, it } from "vitest";
import { renderPrompt, streamCli } from "../src/features/chat/cli-backend.repository.js";
import type { ChatChunk } from "../src/features/chat/types.js";

let bin: string;
let out: string;
let realPath: string | undefined;

function script(name: string, body: string): void {
	const path = join(bin, name);
	writeFileSync(path, `#!/bin/sh\n${body}`);
	chmodSync(path, 0o755);
}

async function collect(cmd: string, args: string[], signal: AbortSignal): Promise<ChatChunk[]> {
	const chunks: ChatChunk[] = [];
	for await (const c of streamCli({ command: cmd, args, prompt: "User: hi", cwd: out }, signal))
		chunks.push(c);
	return chunks;
}

beforeAll(() => {
	bin = mkdtempSync(join(tmpdir(), "flusk-chat-cli-"));
	out = mkdtempSync(join(tmpdir(), "flusk-chat-out-"));
	realPath = process.env.PATH;
	process.env.PATH = `${bin}:${realPath ?? ""}`;
	script(
		"echo-cli",
		`printf '%s' "$*" > ${out}/argv.txt\npwd -P > ${out}/cwd.txt\nprintf 'Hel\\n'\nsleep 0.15\nprintf 'lo'\n`,
	);
	script("fail-cli", `echo 'boom: no credentials' >&2\nexit 3\n`);
	script("noisy-fail-cli", `printf 'partial answer'\necho 'late warning' >&2\nexit 1\n`);
	script("slow-cli", `printf 'start\\n'\nsleep 5\nprintf 'end'\n`);
	script(
		"jsonl-cli",
		`printf '%s\\n' '{"type":"system","subtype":"init","session_id":"s"}'\nprintf '%s\\n' '{"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"parsed!"}}}'\n`,
	);
	const fixture = fileURLToPath(new URL("./fixtures/claude-stream.jsonl", import.meta.url));
	script("fixture-cli", `cat '${fixture}'\n`);
});

afterAll(() => {
	if (realPath === undefined) delete process.env.PATH;
	else process.env.PATH = realPath;
	rmSync(bin, { recursive: true, force: true });
	rmSync(out, { recursive: true, force: true });
});

it("renders the conversation with labelled roles, newest user turn last", () => {
	expect(
		renderPrompt([
			{ role: "user", content: "first" },
			{ role: "assistant", content: "middle" },
			{ role: "user", content: "latest" },
		]),
	).toBe("User: first\n\nAssistant: middle\n\nUser: latest");
	// A trailing assistant turn still leaves the user's question last.
	expect(
		renderPrompt([
			{ role: "user", content: "q" },
			{ role: "assistant", content: "a" },
		]),
	).toBe("Assistant: a\n\nUser: q");
	expect(renderPrompt([])).toBe("");
});

it("streams stdout as deltas, passing the prompt as the final argument", async () => {
	const chunks = await collect("echo-cli", ["-p"], new AbortController().signal);
	expect(chunks.filter((c) => c.type === "delta").length).toBeGreaterThanOrEqual(2);
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("Hel\nlo");
	expect(chunks.some((c) => c.type === "error")).toBe(false);
	expect(chunks.some((c) => c.type === "done")).toBe(false); // the engine owns "done"
	expect(readFileSync(join(out, "argv.txt"), "utf8")).toBe("-p User: hi");
});

it("honours the caller's cwd", async () => {
	const chunks: ChatChunk[] = [];
	const run = { command: "echo-cli", args: [], prompt: "User: hi", cwd: out };
	for await (const c of streamCli(run, new AbortController().signal)) chunks.push(c);
	expect(chunks.some((c) => c.type === "error")).toBe(false);
	expect(readFileSync(join(out, "cwd.txt"), "utf8").trim()).toBe(realpathSync(out));
});

it("announces the exact invocation first, prompt elided, with the cwd", async () => {
	const chunks = await collect("echo-cli", ["-p", "--flag"], new AbortController().signal);
	expect(chunks[0]).toEqual({ type: "cmd", line: "echo-cli -p --flag <prompt>", cwd: out });
});

it("carries the result event's stats through the stream", async () => {
	const chunks = await collect("fixture-cli", [], new AbortController().signal);
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("done");
	expect(chunks.at(-1)).toEqual({ type: "stats", costUsd: 0.0213778, durationMs: 5394, turns: 2 });
});

it("parses claude-style stream-json stdout into clean text deltas", async () => {
	const chunks = await collect("jsonl-cli", [], new AbortController().signal);
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("parsed!");
	expect(chunks.some((c) => c.type === "error")).toBe(false);
});

it("turns a silent non-zero exit into one error chunk carrying the stderr tail", async () => {
	const chunks = await collect("fail-cli", [], new AbortController().signal);
	expect(chunks.map((c) => c.type)).toEqual(["cmd", "error"]);
	expect(chunks[1]).toMatchObject({ message: "fail-cli exited 3: boom: no credentials" });
});

it("keeps output that arrived before a non-zero exit rather than erroring over it", async () => {
	const chunks = await collect("noisy-fail-cli", [], new AbortController().signal);
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("partial answer");
	expect(chunks.some((c) => c.type === "error")).toBe(false);
});

it("reports a missing binary as an error chunk, never a throw", async () => {
	const chunks = await collect("flusk-no-such-cli-9fd2", [], new AbortController().signal);
	expect(chunks.map((c) => c.type)).toEqual(["cmd", "error"]);
	expect((chunks[1] as { message: string }).message).toContain("flusk-no-such-cli-9fd2");
});

it("kills the child on abort and stops the stream", async () => {
	const ac = new AbortController();
	const chunks: ChatChunk[] = [];
	const run = { command: "slow-cli", args: [], prompt: "User: hi", cwd: out };
	for await (const c of streamCli(run, ac.signal)) {
		chunks.push(c);
		if (c.type === "delta") ac.abort();
	}
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("start\n");
	expect(chunks.some((c) => c.type === "error")).toBe(false);
});
