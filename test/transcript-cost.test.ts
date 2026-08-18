/**
 * The pure cost helpers, plus the fmtCost drift guard: format.ts is the one
 * client formatter and summary.ts keeps a byte-identical private copy — this
 * test fails if either is ever edited alone.
 */
import { expect, it } from "vitest";
import { assembleRunSummary } from "../src/features/run/summary.js";
import { SESSION_VERSION, type SessionEntry } from "../src/features/session/entries.js";
import { cumulativeCosts, fmtCost } from "../src/ui/react/runs/format.js";

it("returns an empty array for an empty transcript", () => {
	expect(cumulativeCosts([])).toEqual([]);
});

it("sums only the items that carry usage, leaving the rest undefined", () => {
	const a = 0.01;
	const b = 0.025;
	const items = [
		{}, // user turn
		{ usage: { costUsd: a } },
		{}, // compaction
		{ usage: { costUsd: b } },
	];
	const cums = cumulativeCosts(items);
	expect(cums[0]).toBeUndefined();
	expect(cums[1]).toBeCloseTo(a);
	expect(cums[2]).toBeUndefined();
	expect(cums[3]).toBeCloseTo(a + b);
});

it("a usage object without costUsd contributes 0, never NaN (foreign JSONL)", () => {
	const items = [
		{ usage: { costUsd: 0.01 } },
		{ usage: {} as { costUsd: number } }, // wire type says number; the file is unvalidated
		{ usage: { costUsd: 0.02 } },
	];
	const cums = cumulativeCosts(items);
	expect(cums[1]).toBeCloseTo(0.01); // defined — the row still shows a total
	expect(cums[2]).toBeCloseTo(0.03); // later rows never inherit NaN
	expect(cums.every((c) => c === undefined || Number.isFinite(c))).toBe(true);
});

it("gives a zero-cost errored turn a defined running total", () => {
	const cums = cumulativeCosts([{ usage: { costUsd: 0.01 } }, { usage: { costUsd: 0 } }]);
	expect(cums[1]).toBeCloseTo(0.01);
	expect(cums[1]).toBeDefined();
});

it("pins summary.ts's private fmtCost to format.ts's output (drift guard)", () => {
	const entries: SessionEntry[] = [
		{
			type: "header",
			version: SESSION_VERSION,
			id: "drift1",
			task: "t",
			repoRoot: "/tmp/x",
			gitBranch: null,
			model: { provider: "fake", id: "fake-1", contextWindow: 200_000 },
			createdAt: "2026-08-01T00:00:00.000Z",
		},
		{
			type: "stats",
			id: 1,
			stats: {
				turns: 1,
				usage: { input: 1, output: 1, cacheRead: 0, costUsd: 0.1234 },
				startedAt: "2026-08-01T00:00:00.000Z",
			},
			reason: "completed",
		},
	];
	const summary = assembleRunSummary(entries, null);
	expect(summary.conclusion.includes(fmtCost(0.1234))).toBe(true);
});

it("keeps the formula edge the CLI does differently", () => {
	expect(fmtCost(0.5)).toBe("$0.5"); // never "$0.5000"
});
