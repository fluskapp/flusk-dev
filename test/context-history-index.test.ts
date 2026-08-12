/**
 * The source against the corpus as it really arrives: a JSON index on disk,
 * written by something else, holding rows this version never wrote.
 *
 * The failure modes here are the reason `gather` is total (L7). The served
 * index is a shared file under FLUSK_HOME; an older version's card, a truncated
 * row or an unreadable file must each cost items and a sentence, never the
 * run. Nothing is mocked — the index is written to a temp home and read back
 * through the same pure `loadIndex()` read production takes, which is also why
 * no project config is written here: the corpus is the served file, and
 * nothing about it depends on where the process was started.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { historySource } from "../src/context/source-history.js";
import type { ContextRequest } from "../src/context/types.js";
import { INDEX_VERSION, indexDir, indexPath } from "../src/history/index-store.js";
import { CORPUS, card, MALFORMED, PROJECT, TASK } from "./context-history-fixtures.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repoRoot = "";

const request = (): ContextRequest => ({
	task: TASK,
	repoRoot,
	budgetTokens: 4000,
	isResume: false,
});

beforeAll(async () => {
	const scratch = await setupTestHome("flusk-context-history-");
	repoRoot = join(dirname(scratch), PROJECT);
	await mkdir(repoRoot, { recursive: true });
	await mkdir(indexDir(), { recursive: true });
	// Written by hand rather than through saveIndex: the malformed rows are
	// exactly what a typed writer would refuse, and what the reader still meets.
	await writeFile(
		indexPath(),
		JSON.stringify({
			version: INDEX_VERSION,
			cards: [...CORPUS, ...MALFORMED],
			builtAt: "2026-08-01T00:00:00.000Z",
			stamps: {},
		}),
	);
});

afterAll(() => {
	teardownTestHome();
});

it("reads the served index off disk and ranks what it holds", () => {
	const res = historySource().gather(request());
	expect(res.items.map((i) => i.id)).toContain("history:traps");
	expect(res.items.some((i) => i.tier === "ranked")).toBe(true);
	for (const item of res.items) expect(item.why.trim()).not.toBe("");
});

it("counts the malformed rows instead of dying on them or hiding them", () => {
	const res = historySource().gather(request());
	expect(res.status).toBe("partial");
	expect(res.notes.join(" ")).toMatch(/3 of \d+ indexed cards were malformed/);
	// Degraded, not empty: everything structurally sound still ranked.
	expect(res.items.length).toBeGreaterThan(2);
});

it("degrades to a stated reason when the corpus cannot be read at all", () => {
	const source = historySource(() => {
		throw new Error("EACCES: permission denied, open 'history.json'");
	});
	let res = { items: [{ id: "x" }], status: "ok", notes: [] } as unknown as ReturnType<
		typeof source.gather
	>;
	expect(() => {
		res = source.gather(request());
	}).not.toThrow();
	expect(res.items).toEqual([]);
	expect(res.status).toBe("failed");
	expect(res.notes.join(" ")).toContain("EACCES");
});

it("reports a section that came back at its cap", () => {
	const extra = Array.from({ length: 6 }, (_, n) =>
		card({
			id: `skill:myrepo:.claude/skills/watch-${n}/SKILL.md`,
			kind: "skill",
			ref: `.claude/skills/watch-${n}/SKILL.md`,
			paths: [`.claude/skills/watch-${n}/SKILL.md`],
			title: `watch tick convention ${n}`,
			text: `Rule ${n}: the watch tick hook takes its retry backoff from config.`,
		}),
	);
	const res = historySource(() => [...CORPUS, ...extra]).gather(request());
	expect(res.notes.join(" ")).toMatch(/conventions section came back at its cap of 4/);
});
