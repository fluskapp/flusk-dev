/**
 * Search across every configured project: what rg's JSON stream becomes, and
 * the flags that change the answer.
 *
 * The byte→character assertion is the one to keep honest. rg reports BYTE
 * offsets and the dashboard highlights CHARACTERS, so an accented line is
 * where a passing test and a visibly wrong highlight diverge.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toRanges } from "../src/features/search/rg-offsets.js";
import { MAX_LINE, toMatch } from "../src/features/search/rg-parse.js";
import { find } from "../src/features/search/ripgrep.js";
import type { FindResult } from "../src/features/search/types.js";
import { type FindTree, findTree, hasRg, UNICODE_LINE } from "./find-fixture.js";

let t: FindTree;

beforeAll(() => {
	t = findTree();
});
afterAll(() => t.cleanup());

const lines = (r: FindResult): string[] => r.files.flatMap((f) => f.matches.map((m) => m.text));
const named = (r: FindResult, name: string) =>
	r.files.find((f) => f.path.endsWith(name))?.matches ?? [];

it("converts rg's byte offsets to character offsets", () => {
	// "héllo wörld needle here": rg says the match starts at byte 14; the
	// string says character 12. Trusting rg here paints two chars to the right.
	expect(UNICODE_LINE.indexOf("needle")).toBe(12);
	expect(Buffer.from(UNICODE_LINE, "utf8").indexOf("needle")).toBe(14);
	const whole = { origin: 0, width: UNICODE_LINE.length };
	expect(toRanges(UNICODE_LINE, [{ start: 14, end: 20 }], whole)).toEqual([[12, 18]]);
	// A range that falls past the kept window is dropped, not clamped to a
	// zero-width span the UI would paint at the wrong place.
	expect(toRanges(UNICODE_LINE, [{ start: 14, end: 20 }], { origin: 0, width: 5 })).toEqual([]);
	expect(toRanges(UNICODE_LINE, [{ start: 14 }], whole)).toEqual([]);
	// A window that starts mid-line reports offsets relative to that window.
	expect(toRanges(UNICODE_LINE, [{ start: 14, end: 20 }], { origin: 7, width: 16 })).toEqual([
		[5, 11],
	]);
});

it("stays linear when one line carries a hundred thousand submatches", () => {
	// A 600KB single line under rg's --max-filesize cap: re-decoding the line
	// per submatch blocked the event loop for over a minute, and the search
	// timeout could not fire because its own timer was starved.
	const line = "a".repeat(600_000);
	const subs = Array.from({ length: 100_000 }, (_, i) => ({ start: i, end: i + 1 }));
	const started = Date.now();
	const m = toMatch(
		{ path: { text: "/x" }, line_number: 1, lines: { text: line }, submatches: subs },
		"p",
	);
	expect(Date.now() - started).toBeLessThan(2000);
	expect(m?.text).toHaveLength(MAX_LINE);
	expect(m?.ranges[0]).toEqual([0, 1]);
});

it("keeps a match that sits past the line cap inside the window it sends", () => {
	// Slicing [0, 400) dropped the range and shipped 400 characters that did
	// not contain the query — a row that reads as a false positive.
	const body = `${"x".repeat(500)}needle${"y".repeat(50)}`;
	const m = toMatch(
		{
			path: { text: "/x" },
			line_number: 3,
			lines: { text: `${body}\n` },
			submatches: [{ start: 500, end: 506 }],
		},
		"p",
	);
	expect(m?.text.startsWith("…")).toBe(true);
	expect(m?.text).toHaveLength(MAX_LINE + 1);
	const [from, to] = m?.ranges[0] ?? [0, 0];
	expect(m?.text.slice(from, to)).toBe("needle");
});

describe.skipIf(!hasRg())("ripgrep-backed search", () => {
	it("finds matches in every configured project, grouped by file", async () => {
		const r = await find(t.cfg, { q: "needle" });
		expect(r.truncated).toBe(false);
		expect(r.note).toBeUndefined();
		expect(r.total).toBe(r.files.reduce((n, f) => n + f.matches.length, 0));
		expect(new Set(r.files.map((f) => f.project))).toEqual(new Set(["alpha", "beta"]));
		expect(r.files.every((f) => f.matches.every((m) => m.path === f.path))).toBe(true);
		expect(r.tookMs).toBeGreaterThanOrEqual(0);
	});

	it("carries character ranges through a real search of a unicode line", async () => {
		const r = await find(t.cfg, { q: "needle" });
		const uni = named(r, "src/uni.txt")[0];
		expect(uni?.text).toBe(UNICODE_LINE);
		expect(uni?.ranges).toEqual([[12, 18]]);
		expect(uni?.line).toBe(1);
	});

	it("caps a very long line and slides the window onto the match", async () => {
		const long = named(await find(t.cfg, { q: "needle" }), "src/long.txt")[0];
		// The needle sits at character 500 — past the cap. The window slides so
		// the row still shows the query it claims to have matched.
		expect(long?.text).toHaveLength(MAX_LINE + 1);
		expect(long?.text.startsWith("…")).toBe(true);
		const [from, to] = long?.ranges[0] ?? [0, 0];
		expect(long?.text.slice(from, to)).toBe("needle");
	});

	it("filters by glob", async () => {
		const r = await find(t.cfg, { q: "needle", glob: "*.md" });
		expect(r.files.map((f) => f.path.split("/").at(-1))).toEqual(["notes.md"]);
	});

	it("searches literally by default and as a regex on request", async () => {
		const literal = await find(t.cfg, { q: "n.edle", project: "beta" });
		expect(lines(literal)).toEqual(["a n.edle literal"]);
		const regex = await find(t.cfg, { q: "n.edle", project: "beta", regex: true });
		expect(lines(regex).sort()).toEqual(["a n.edle literal", "beta needle here"]);
	});

	it("is case-insensitive by default and exact on request", async () => {
		const loose = await find(t.cfg, { q: "NEEDLE" });
		expect(loose.total).toBeGreaterThan(1);
		const exact = await find(t.cfg, { q: "NEEDLE", caseSensitive: true });
		expect(lines(exact)).toEqual(["find the NEEDLE again"]);
	});

	it("answers an empty query with a note instead of searching everything", async () => {
		const r = await find(t.cfg, { q: "   " });
		expect(r).toMatchObject({ total: 0, truncated: false, note: "empty query" });
	});
});
