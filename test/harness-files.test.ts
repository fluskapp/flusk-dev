/**
 * `.flusk/harnesses` on disk: builtin synthesis follows PATH, project shadows
 * global by id, a broken shadow refuses the id WITH its reason, and an
 * untrusted project spec is listed-but-unavailable until
 * ~/.flusk/trusted-projects.json vouches for the repo (H0 D4).
 */
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
	globalHarnessDir,
	projectHarnessDir,
	readHarness,
	scanHarnesses,
} from "../src/features/harnesses/harness-files.repository.js";
import { fluskHome } from "../src/platform/paths/paths.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
let bin: string;
let realPath: string | undefined;

beforeEach(async () => {
	repo = await setupTestHome("flusk-harness-");
	bin = mkdtempSync(join(tmpdir(), "flusk-harness-bin-"));
	realPath = process.env.PATH;
	process.env.PATH = bin; // only OUR stubs are on PATH
	mkdirSync(globalHarnessDir(), { recursive: true });
	mkdirSync(projectHarnessDir(repo), { recursive: true });
});
afterEach(() => {
	if (realPath === undefined) delete process.env.PATH;
	else process.env.PATH = realPath;
	rmSync(bin, { recursive: true, force: true });
	teardownTestHome();
});

function stub(name: string): void {
	const path = join(bin, name);
	writeFileSync(path, "#!/bin/sh\n");
	chmodSync(path, 0o755);
}

const spec = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
	type: "harness",
	kind: "script",
	command: "mytool",
	...over,
});

const write = (dir: string, id: string, data: unknown): void =>
	writeFileSync(join(dir, `${id}.json`), typeof data === "string" ? data : JSON.stringify(data));

const trust = (root: string): void =>
	writeFileSync(join(fluskHome(), "trusted-projects.json"), JSON.stringify([root]));

const byId = (root: string | null, id: string) =>
	scanHarnesses(root).harnesses.find((h) => h.id === id);

test("built-ins are synthesized from a PATH probe; absent rows still list", () => {
	stub("claude"); // codex stays off PATH
	const cc = byId(null, "claude-code");
	expect(cc).toMatchObject({ scope: "builtin", command: "claude", available: true, path: null });
	expect(cc?.args).toContain("--output-format");
	expect(byId(null, "codex")).toMatchObject({
		available: false,
		note: "codex not found on PATH",
	});
});

test("project shadows global by id; the shadowed spec's fields win wholesale", () => {
	stub("mytool");
	trust(repo);
	write(globalHarnessDir(), "mine", spec({ args: ["--global"] }));
	write(projectHarnessDir(repo), "mine", spec({ args: ["--project"] }));
	expect(byId(repo, "mine")).toMatchObject({ scope: "project", args: ["--project"], available: true });
	// Without a repoRoot the project scope never contributes.
	expect(byId(null, "mine")).toMatchObject({ scope: "global", args: ["--global"] });
});

test("a broken project file is skipped WITH its reason and refuses the id", () => {
	stub("mytool");
	trust(repo);
	write(globalHarnessDir(), "demo", spec());
	write(projectHarnessDir(repo), "demo", "{ not json");
	const scan = scanHarnesses(repo);
	expect(scan.harnesses.find((h) => h.id === "demo")).toBeUndefined();
	expect(scan.skipped).toHaveLength(1);
	expect(scan.skipped[0]?.why).toMatch(/JSON|Unexpected/i);
	const read = readHarness(repo, "demo");
	expect(read.ok).toBe(false);
	expect(!read.ok && read.why).toMatch(/JSON|Unexpected/i);
});

test("an unknown key refuses the file, never silently drops the field", () => {
	write(globalHarnessDir(), "drifted", spec({ cwdPolicy: "anywhere" }));
	const scan = scanHarnesses(null);
	expect(scan.harnesses.find((h) => h.id === "drifted")).toBeUndefined();
	expect(scan.skipped[0]?.why).toBe('unknown key "cwdPolicy"');
});

test("an untrusted project harness is listed, unavailable, and says why", () => {
	stub("mytool");
	write(projectHarnessDir(repo), "evil", spec());
	expect(byId(repo, "evil")).toMatchObject({
		scope: "project",
		available: false,
		note: "project harness — repo not trusted",
	});
	const read = readHarness(repo, "evil");
	expect(read.ok && read.meta.available).toBe(false);
});

test("a trusted-projects entry flips the project harness to runnable", () => {
	stub("mytool");
	write(projectHarnessDir(repo), "mine", spec());
	trust(repo);
	expect(byId(repo, "mine")).toMatchObject({ scope: "project", available: true });
	// Trusted but off PATH is still honest about what is missing.
	write(projectHarnessDir(repo), "ghost", spec({ command: "no-such-tool-9fd2" }));
	expect(byId(repo, "ghost")).toMatchObject({
		available: false,
		note: "no-such-tool-9fd2 not found on PATH",
	});
});

test("readHarness refuses an unknown id with a stated why", () => {
	const read = readHarness(repo, "nope");
	expect(read).toEqual({ ok: false, why: '"nope" is not a configured harness' });
});
