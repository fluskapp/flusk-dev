/**
 * The review queue's pure derivation (src/ui/react/overview/review-queue.ts):
 * membership, attention order (warn before err — review urgency, not
 * severity), and park semantics — a parked run reappears on new activity.
 */
import { describe, expect, it } from "vitest";
import type { RunRow } from "../src/features/projects/projects.types.js";
import { groupKey, isParked, needsReview, parkEntry, parseParkMap, reviewQueue } from "../src/ui/react/overview/review-queue.js";

const row = (over: Partial<RunRow>): RunRow => ({
	id: "r1",
	kind: "session",
	project: "p",
	title: "t",
	status: "completed",
	at: "2026-08-15T10:00:00.000Z",
	ref: "p/r1.jsonl",
	verdict: "ok",
	filesTouched: 0,
	...over,
});

describe("needsReview", () => {
	it("warn and err need a human even with no files", () => {
		expect(needsReview(row({ verdict: "warn", filesTouched: 0 }))).toBe(true);
		expect(needsReview(row({ verdict: "err", filesTouched: 0 }))).toBe(true);
	});
	it("ok/none qualify only by touched files", () => {
		expect(needsReview(row({ verdict: "ok", filesTouched: 2 }))).toBe(true);
		expect(needsReview(row({ verdict: "ok", filesTouched: 0 }))).toBe(false);
		expect(needsReview(row({ verdict: "none", filesTouched: 1 }))).toBe(true);
		expect(needsReview(row({ verdict: "none", filesTouched: 0 }))).toBe(false);
	});
	it("live is never reviewable — not finished", () => {
		expect(needsReview(row({ verdict: "live", status: "running", filesTouched: 5 }))).toBe(false);
	});
	it("a journal has no file count: only its verdict admits it", () => {
		const j = (verdict: RunRow["verdict"]) =>
			row({ kind: "journal", verdict, filesTouched: undefined, ref: "/h/docs/runs/x.md" });
		expect(needsReview(j("err"))).toBe(true);
		expect(needsReview(j("ok"))).toBe(false);
	});
	it("no verdict falls back to status (native scanner rows)", () => {
		expect(needsReview(row({ verdict: undefined, status: "blocked" }))).toBe(true);
		expect(needsReview(row({ verdict: undefined, status: "running" }))).toBe(false);
	});
});

describe("reviewQueue order", () => {
	// Distinct titles: same-titled rows are one GROUP, tested below.
	it("verdict band first (warn, err, none, ok), files desc inside a band", () => {
		const rows = [
			row({ id: "a", title: "a", ref: "p/a.jsonl", verdict: "ok", filesTouched: 3 }),
			row({ id: "b", title: "b", ref: "p/b.jsonl", verdict: "err", filesTouched: 0 }),
			row({ id: "c", title: "c", ref: "p/c.jsonl", verdict: "warn", filesTouched: 0 }),
			row({ id: "d", title: "d", ref: "p/d.jsonl", verdict: "none", filesTouched: 2 }),
			row({ id: "e", title: "e", ref: "p/e.jsonl", verdict: "warn", filesTouched: 5 }),
		];
		expect(reviewQueue(rows, {}).map((r) => r.id)).toEqual(["e", "c", "b", "d", "a"]);
	});
	it("equal verdict and files order by at desc — newest first", () => {
		const rows = [
			row({ id: "old", title: "old", ref: "p/old.jsonl", verdict: "warn", at: "2026-08-14T10:00:00.000Z" }),
			row({ id: "new", title: "new", ref: "p/new.jsonl", verdict: "warn", at: "2026-08-15T10:00:00.000Z" }),
		];
		expect(reviewQueue(rows, {}).map((r) => r.id)).toEqual(["new", "old"]);
	});
});

describe("retry stacking", () => {
	const attempt = (id: string, at: string) =>
		row({ id, ref: `p/${id}.jsonl`, verdict: "err", at, title: " review  PR #264 " });
	const retries = [
		attempt("a1", "2026-08-13T10:00:00.000Z"),
		attempt("a2", "2026-08-13T11:00:00.000Z"),
		attempt("a3", "2026-08-13T12:00:00.000Z"),
	];
	it("same project + normalized title stack into one row, newest kept", () => {
		const q = reviewQueue([...retries, row({ id: "z", title: "other", ref: "p/z.jsonl", verdict: "warn" })], {});
		expect(q.map((r) => [r.id, r.attempts])).toEqual([["z", 1], ["a3", 3]]);
	});
	it("parking the group hides every attempt; a NEW retry un-parks it", () => {
		const park = parkEntry({}, retries[2] as (typeof retries)[number]);
		expect(reviewQueue(retries, park)).toEqual([]);
		const fresh = attempt("a4", "2026-08-14T09:00:00.000Z");
		expect(reviewQueue([...retries, fresh], park).map((r) => [r.id, r.attempts])).toEqual([["a4", 4]]);
	});
	it("same title in ANOTHER project is a different group", () => {
		const other = row({ id: "q1", project: "q", ref: "q/a.jsonl", verdict: "err", title: "review PR #264" });
		expect(reviewQueue([...retries, other], {})).toHaveLength(2);
	});
});

describe("park", () => {
	it("parkEntry returns a new map keyed group → at, input untouched", () => {
		const before = { "p/x.jsonl": "2026-08-10T00:00:00.000Z" };
		const r = row({ verdict: "warn" });
		const next = parkEntry(before, r);
		expect(next).not.toBe(before);
		expect(before).toEqual({ "p/x.jsonl": "2026-08-10T00:00:00.000Z" });
		expect(next[groupKey(r)]).toBe(r.at);
	});
	it("a stored at matching the row hides it; a newer at reappears", () => {
		const r = row({ verdict: "warn" });
		const park = parkEntry({}, r);
		expect(isParked(r, park)).toBe(true);
		expect(reviewQueue([r], park)).toEqual([]);
		const bumped = row({ verdict: "warn", at: "2026-08-16T10:00:00.000Z" });
		expect(isParked(bumped, park)).toBe(false);
		expect(reviewQueue([bumped], park).map((x) => x.id)).toEqual(["r1"]);
	});
	it("the empty map — the SSR snapshot ReviewQueue hydrates with — hides nothing", () => {
		const r = row({ verdict: "warn" });
		expect(isParked(r, {})).toBe(false);
		expect(reviewQueue([r], {}).map((x) => x.id)).toEqual(["r1"]);
	});
	it("park entries for groups not in the feed are inert", () => {
		const r = row({ verdict: "err" });
		const park = { "q/gone.jsonl": "2026-08-01T00:00:00.000Z" };
		expect(reviewQueue([r], park).map((x) => x.id)).toEqual(["r1"]);
	});
});

describe("parseParkMap", () => {
	it("null, garbage, and arrays all read as the empty map", () => {
		expect(parseParkMap(null)).toEqual({});
		expect(parseParkMap("not json")).toEqual({});
		expect(parseParkMap("[]")).toEqual({});
	});
	it("non-string values are dropped, string ones kept", () => {
		expect(parseParkMap('{"a":1,"b":"2026-08-15"}')).toEqual({ b: "2026-08-15" });
	});
});
