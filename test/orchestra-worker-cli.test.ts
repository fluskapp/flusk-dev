import { chmodSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { FluskConfig } from "../src/platform/config/types.js";
import { cliWorker } from "../src/features/orchestra/worker-cli.js";
import { cfgWith, initRepo, makeSpec, makeTask } from "./orchestra-fixture.js";

/**
 * No real coding CLI is ever invoked: PATH points at shell scripts that stand
 * in for one — including one that edits a file and then lies about it.
 */
let bin: string;
let repo: string;
let cfg: FluskConfig;
let realPath: string | undefined;

const never = new AbortController().signal;

function script(name: string, body: string): void {
	const path = join(bin, name);
	writeFileSync(path, `#!/bin/sh\n${body}`);
	chmodSync(path, 0o755);
}

beforeAll(() => {
	bin = mkdtempSync(join(tmpdir(), "flusk-orch-bin-"));
	repo = realpathSync(mkdtempSync(join(tmpdir(), "flusk-orch-repo-")));
	initRepo(repo);
	realPath = process.env.PATH;
	process.env.PATH = `${bin}:${realPath ?? ""}`;
	script(
		"liar-agent",
		`printf '%s' "$*" > argv.txt\nprintf 'edited\\n' >> seed.txt\nprintf 'I changed nothing.'\n`,
	);
	script("fail-agent", `echo 'no credentials on this machine' >&2\nexit 3\n`);
	script("slow-agent", `printf 'starting'\nsleep 5\nprintf 'end'\n`);
	cfg = cfgWith([
		{ id: "liar", kind: "cli", command: "liar-agent", args: ["-p"] },
		{ id: "failing", kind: "cli", command: "fail-agent", args: [] },
		{ id: "slow", kind: "cli", command: "slow-agent", args: [] },
		{ id: "absent", kind: "cli", command: "flusk-no-such-agent-4b21", args: [] },
		{ id: "endpoint", kind: "openai-compatible", baseUrl: "http://127.0.0.1:1/v1", model: "m" },
	]);
});

afterAll(() => {
	if (realPath === undefined) delete process.env.PATH;
	else process.env.PATH = realPath;
	rmSync(bin, { recursive: true, force: true });
	rmSync(repo, { recursive: true, force: true });
});

const spec = (name: string, backendId: string) => makeSpec({ name, worker: "cli", backendId });

it("reports availability from the backend without spawning the agent", async () => {
	const worker = cliWorker(cfg);
	expect(await worker.available(spec("ok", "liar"))).toEqual({ ok: true });
	expect(await worker.available(spec("gone", "absent"))).toMatchObject({
		ok: false,
		reason: "flusk-no-such-agent-4b21 not found on PATH",
	});
	// An id the user never configured is refused, never quietly swapped.
	expect(await worker.available(spec("unknown", "made-up"))).toMatchObject({
		ok: false,
		reason: 'backend "made-up" is not configured',
	});
	// A backend of the wrong kind is not a CLI, whatever the spec claims.
	expect(await worker.available(spec("wrong", "endpoint"))).toMatchObject({ ok: false });
});

it("observes what the agent touched instead of believing what it says", async () => {
	const result = await cliWorker(cfg).run(makeTask(spec("liar", "liar"), "tidy up", repo, never));

	expect(result.ok).toBe(true);
	expect(result.summary).toBe("I changed nothing.");
	expect(result.filesTouched).toEqual([join(repo, "argv.txt"), join(repo, "seed.txt")]);
	// S4: the task reaches the binary as ONE argv element after the backend's
	// own args — never interpolated into a command line.
	const argv = readFileSync(join(repo, "argv.txt"), "utf8");
	expect(argv.startsWith("-p ")).toBe(true);
	expect(argv).toContain("<task>");
	expect(argv).toContain("tidy up");
});

it("a failing CLI is ok:false with the stderr tail, not an exception", async () => {
	const result = await cliWorker(cfg).run(makeTask(spec("fail", "failing"), "do it", repo, never));

	expect(result.ok).toBe(false);
	expect(result.error).toContain("exited 3");
	expect(result.error).toContain("no credentials");
	expect(result.summary).not.toBe("");
	expect(result.filesTouched).toEqual([]);
});

it("an uninstalled agent is refused as a result, and nothing is spawned", async () => {
	const result = await cliWorker(cfg).run(makeTask(spec("gone", "absent"), "do it", repo, never));
	expect(result.ok).toBe(false);
	expect(result.error).toContain("not found on PATH");
});

it("abort kills the child and resolves ok:false", async () => {
	const ac = new AbortController();
	setTimeout(() => ac.abort(), 150);
	const result = await cliWorker(cfg).run(makeTask(spec("slow", "slow"), "wait", repo, ac.signal));
	expect(result.ok).toBe(false);
	expect(result.error).toBe("aborted");
});
