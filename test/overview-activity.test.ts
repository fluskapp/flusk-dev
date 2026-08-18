/**
 * buildOverview's activity rows are openable and verdict-first: each carries
 * the ref it opens with, and a verdict — passed through from the TS scanner's
 * summary, or derived from status when a native-scanner row lacks one.
 */
import { expect, it } from "vitest";
import type { Journal } from "../src/features/projects/journal-scan.repository.js";
import { buildOverview } from "../src/features/projects/overview.js";
import type { SessionSummary } from "../src/features/projects/scan.repository.js";

const MODEL = { provider: "fake", id: "fake-1", contextWindow: 200_000 };

const summary = (over: Partial<SessionSummary>): SessionSummary => ({
	key: "repo/s1.jsonl",
	repoRoot: "/w/repo",
	task: "fix the gate",
	sessionId: "s1",
	createdAt: "2026-08-10T10:00:00.000Z",
	updatedAtMs: 1_786_356_000_000,
	status: "completed",
	turns: 2,
	costUsd: 0.1,
	model: MODEL,
	...over,
});

const journal: Journal = {
	title: "Run: nightly",
	date: "2026-08-10T11:00:00.000Z",
	status: "failed",
	stages: [],
	path: "/w/h/docs/runs/2026-08-10-nightly.md",
	harness: "h",
	harnessRoot: "/w/h",
	mtimeMs: 1_786_359_600_000,
};

it("a session activity item carries its key as ref and the summary's verdict", () => {
	const s = summary({ verdict: "warn", filesTouched: 3 });
	const item = buildOverview([s], [], 0).activity[0];
	expect(item?.ref).toBe("repo/s1.jsonl");
	expect(item?.verdict).toBe("warn");
});

it("a journal activity item carries its path as ref and a status-derived verdict", () => {
	const item = buildOverview([], [journal], 0).activity[0];
	expect(item?.ref).toBe(journal.path);
	expect(item?.verdict).toBe("err"); // "failed" → err
});

it("a native-scanner row without verdict still yields one — the fallback is real", () => {
	const item = buildOverview([summary({})], [], 0).activity[0];
	expect(item?.verdict).toBe("ok"); // statusToVerdict("completed")
});

it("counts harness runs from the true per-root counts, not the capped feed", () => {
	// The feed carries 1 journal (the cap sliced the rest); the dir holds 548.
	const o = buildOverview([], [journal], 0, new Map([["/w/h", 548]]));
	expect(o.stats.find((s) => s.label === "harness runs")?.value).toBe("548");
	expect(o.harnesses).toEqual([{ name: "h", runs: 548, live: 0 }]);
});

it("without counts the capped feed is all there is to count", () => {
	const o = buildOverview([], [journal], 0);
	expect(o.stats.find((s) => s.label === "harness runs")?.value).toBe("1");
});
