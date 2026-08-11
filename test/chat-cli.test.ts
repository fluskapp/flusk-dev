import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { ahRepoRoot, renderPrompt, streamCli } from "../src/chat/cli-backend.js";
import type { ChatChunk } from "../src/chat/types.js";

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
	for await (const c of streamCli({ command: cmd, args, prompt: "User: hi" }, signal))
		chunks.push(c);
	return chunks;
}

beforeAll(() => {
	bin = mkdtempSync(join(tmpdir(), "ah-chat-cli-"));
	out = mkdtempSync(join(tmpdir(), "ah-chat-out-"));
	realPath = process.env.PATH;
	process.env.PATH = `${bin}:${realPath ?? ""}`;
	script(
		"echo-cli",
		`printf '%s' "$*" > ${out}/argv.txt\npwd -P > ${out}/cwd.txt\nprintf 'Hel'\nsleep 0.15\nprintf 'lo'\n`,
	);
	script("fail-cli", `echo 'boom: no credentials' >&2\nexit 3\n`);
	script("noisy-fail-cli", `printf 'partial answer'\necho 'late warning' >&2\nexit 1\n`);
	script("slow-cli", `printf 'start'\nsleep 5\nprintf 'end'\n`);
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
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("Hello");
	expect(chunks.some((c) => c.type === "error")).toBe(false);
	expect(chunks.some((c) => c.type === "done")).toBe(false); // the engine owns "done"
	expect(readFileSync(join(out, "argv.txt"), "utf8")).toBe("-p User: hi");
	// default cwd is the ah checkout, not wherever the dashboard was started
	expect(readFileSync(join(out, "cwd.txt"), "utf8").trim()).toBe(realpathSync(ahRepoRoot()));
});

it("honours an explicit cwd", async () => {
	const chunks: ChatChunk[] = [];
	const run = { command: "echo-cli", args: [], prompt: "User: hi", cwd: out };
	for await (const c of streamCli(run, new AbortController().signal)) chunks.push(c);
	expect(chunks.some((c) => c.type === "error")).toBe(false);
	expect(readFileSync(join(out, "cwd.txt"), "utf8").trim()).toBe(realpathSync(out));
});

it("turns a silent non-zero exit into one error chunk carrying the stderr tail", async () => {
	const chunks = await collect("fail-cli", [], new AbortController().signal);
	expect(chunks).toHaveLength(1);
	expect(chunks[0]?.type).toBe("error");
	expect(chunks[0]).toMatchObject({ message: "fail-cli exited 3: boom: no credentials" });
});

it("keeps output that arrived before a non-zero exit rather than erroring over it", async () => {
	const chunks = await collect("noisy-fail-cli", [], new AbortController().signal);
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("partial answer");
	expect(chunks.some((c) => c.type === "error")).toBe(false);
});

it("reports a missing binary as an error chunk, never a throw", async () => {
	const chunks = await collect("ah-no-such-cli-9fd2", [], new AbortController().signal);
	expect(chunks).toHaveLength(1);
	expect(chunks[0]?.type).toBe("error");
	expect((chunks[0] as { message: string }).message).toContain("ah-no-such-cli-9fd2");
});

it("kills the child on abort and stops the stream", async () => {
	const ac = new AbortController();
	const chunks: ChatChunk[] = [];
	const run = { command: "slow-cli", args: [], prompt: "User: hi" };
	for await (const c of streamCli(run, ac.signal)) {
		chunks.push(c);
		if (c.type === "delta") ac.abort();
	}
	expect(chunks.map((c) => (c.type === "delta" ? c.text : "")).join("")).toBe("start");
	expect(chunks.some((c) => c.type === "error")).toBe(false);
});
