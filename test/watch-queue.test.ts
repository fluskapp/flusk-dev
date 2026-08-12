/**
 * Queue pollers, exercised against a fake `gh` placed on PATH — hermetic, no
 * network, no GitHub account.
 */
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { pollGhFailingCi, pollGhPrs, pollQueues } from "../src/watch/queue.js";

let bin: string;
let repo: string;
let originalPath: string | undefined;

/** Install a `gh` that prints `stdout` and exits with `code`. */
function fakeGh(stdout: string, code = 0): void {
	const script = `#!/bin/sh\ncat <<'JSON'\n${stdout}\nJSON\nexit ${code}\n`;
	const p = join(bin, "gh");
	writeFileSync(p, script);
	chmodSync(p, 0o755);
}

beforeEach(() => {
	bin = mkdtempSync(join(tmpdir(), "flusk-bin-"));
	repo = mkdtempSync(join(tmpdir(), "flusk-repo-"));
	originalPath = process.env.PATH;
	process.env.PATH = `${bin}:${process.env.PATH ?? ""}`;
});

afterEach(() => {
	process.env.PATH = originalPath;
});

it("turns open PRs into work items with a usable task", () => {
	fakeGh(
		JSON.stringify([
			{ number: 7, title: "Add parser", updatedAt: "2026-08-02T10:00:00Z", headRefName: "feat/p" },
		]),
	);
	const { items, notes } = pollGhPrs(repo);
	expect(notes).toEqual([]);
	expect(items).toHaveLength(1);
	expect(items[0]).toMatchObject({ key: "gh-prs-7", queue: "gh-prs", ref: "feat/p" });
	expect(items[0]?.task).toContain("#7");
	// The agent must not be told to merge or close anything.
	expect(items[0]?.task).toContain("Do not merge");
});

it("turns failing CI runs into work items", () => {
	fakeGh(
		JSON.stringify([
			{
				databaseId: 991,
				displayTitle: "nightly",
				headBranch: "main",
				updatedAt: "2026-08-03T10:00:00Z",
			},
		]),
	);
	const { items } = pollGhFailingCi(repo);
	expect(items[0]).toMatchObject({ key: "gh-failing-ci-991", ref: "main" });
	expect(items[0]?.task).toContain("Reproduce");
});

it("degrades to an empty queue with a note when gh fails", () => {
	fakeGh("", 1);
	const { items, notes } = pollGhPrs(repo);
	expect(items).toEqual([]);
	expect(notes[0]).toContain("gh-prs unavailable");
});

it("degrades when gh is not installed at all", () => {
	process.env.PATH = "/nonexistent";
	const { items, notes } = pollGhPrs(repo);
	expect(items).toEqual([]);
	expect(notes).toHaveLength(1);
});

it("survives malformed JSON without throwing", () => {
	fakeGh("not json at all");
	expect(pollGhPrs(repo).items).toEqual([]);
});

it("merges configured queues oldest-first and flags unknown ones", () => {
	fakeGh(
		JSON.stringify([
			{ number: 1, title: "old", updatedAt: "2026-08-01T00:00:00Z", headRefName: "a" },
		]),
	);
	const { items, notes } = pollQueues(repo, ["gh-prs", "nope"]);
	expect(items.map((i) => i.key)).toEqual(["gh-prs-1"]);
	expect(notes.some((n) => n.includes('unknown queue "nope"'))).toBe(true);
});
