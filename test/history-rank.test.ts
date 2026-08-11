import { expect, it } from "vitest";
import { buildIndex } from "../src/history/bm25.js";
import { expandTerm } from "../src/history/fuzzy.js";
import { search, selectDiverse } from "../src/history/rank.js";
import { tokenize, trigrams } from "../src/history/tokenize.js";
import type { HistoryCard, Outcome, SearchHit } from "../src/history/types.js";

const NOW = Date.parse("2026-08-11T00:00:00.000Z");
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

function card(p: Partial<HistoryCard> & { id: string }): HistoryCard {
	return {
		kind: "commit",
		project: "ah",
		title: "",
		text: "",
		at: daysAgo(10),
		paths: [],
		outcome: "unknown",
		ref: p.id,
		...p,
	};
}

const idsOf = (hits: SearchHit[]): string[] => hits.map((h) => h.card.id);

it("keeps identifiers whole and also splits camelCase and snake_case", () => {
	expect(tokenize("retryHook")).toEqual(["retryhook", "retry", "hook"]);
	expect(tokenize("retry_hook")).toEqual(["retry_hook", "retry", "hook"]);
	expect(tokenize("HTTPServer fix")).toEqual(["httpserver", "http", "server", "fix"]);
	expect(tokenize("src/watch/tick.ts")).toEqual(["src", "watch", "tick", "ts"]);
	expect(tokenize("a of the it")).toEqual([]); // stopwords and one-char tokens
	expect(trigrams("hook")).toEqual(["^ho", "hoo", "ook", "ok$"]);
});

it("orders by BM25: title beats body, and a rare term beats a common one", () => {
	const index = buildIndex([
		card({ id: "title", title: "retry hook backoff" }),
		card({ id: "body", text: "we mention the retry hook once, deep in a long body" }),
		card({ id: "other", title: "unrelated parser work", text: "retry" }),
	]);
	expect(idsOf(search(index, { text: "retry hook" }, { now: NOW })).slice(0, 2)).toEqual([
		"title",
		"body",
	]);
});

it("expands a typo only when exact postings are scarce, always below exact", () => {
	const index = buildIndex([
		card({ id: "exact", title: "retry backoff" }),
		card({ id: "typo-target", title: "retries of the worker" }),
	]);
	expect(expandTerm(index, "retry")).toEqual([]); // the corpus has it: no correction
	const expansions = expandTerm(index, "retryy");
	expect(expansions.map((e) => e.term)).toContain("retry");
	for (const e of expansions) {
		expect(e.fuzzy).toBe(true);
		expect(e.weight).toBeLessThan(1);
	}
	expect(expandTerm(index, "zzzqqq")).toEqual([]); // nothing near it
});

it("never lets a fuzzy match outrank an exact one, whatever else favours it", () => {
	const index = buildIndex([
		card({ id: "exact", title: "retry backoff logic", at: daysAgo(900), outcome: "unknown" }),
		card({ id: "near", title: "retry backof logic", at: daysAgo(0), outcome: "verified" }),
	]);
	const hits = search(index, { text: "backoff" }, { now: NOW });
	expect(idsOf(hits)).toEqual(["exact", "near"]); // fresher AND verified still loses
	expect(hits[0]?.why.fuzzy).toBe(0);
	expect(hits[1]?.why.fuzzy).toBeGreaterThan(0);
	expect(hits[1]?.why.lexical).toBeLessThan(hits[0]?.why.lexical ?? 0);
});

it("lets a clearly better lexical match beat a much fresher card", () => {
	const index = buildIndex([
		card({ id: "old-right", title: "retry hook backoff", text: "retry hook", at: daysAgo(730) }),
		card({ id: "new-weak", title: "hook", at: daysAgo(0) }),
	]);
	const hits = search(index, { text: "retry hook" }, { now: NOW });
	expect(hits[0]?.card.id).toBe("old-right");
	expect(hits[0]?.why.recency).toBeLessThan(hits[1]?.why.recency ?? 0);
	expect(hits[1]?.why.recency).toBeLessThanOrEqual(1.35); // capped, never dominant
});

it("ranks outcomes verified > shipped > unknown > blocked > failed, and can invert", () => {
	const outcomes: Outcome[] = ["verified", "shipped", "unknown", "blocked", "failed"];
	const index = buildIndex(outcomes.map((o) => card({ id: o, title: "retry hook", outcome: o })));
	const query = { text: "retry hook" };
	expect(idsOf(search(index, query, { now: NOW }))).toEqual(outcomes);
	const failuresFirst = search(index, query, { now: NOW, outcomeWeights: { failed: 3 } });
	expect(failuresFirst[0]?.card.id).toBe("failed"); // failures stay retrievable
});

it("boosts cards touching the paths the task names", () => {
	const index = buildIndex([
		card({ id: "same-file", title: "retry hook", paths: ["src/watch/tick.ts"] }),
		card({ id: "elsewhere", title: "retry hook", paths: ["docs/readme.md"] }),
	]);
	const hits = search(index, { text: "retry hook", paths: ["src/watch/tick.ts"] }, { now: NOW });
	const top = hits[0];
	expect(top?.card.id).toBe("same-file");
	expect(top?.why.path).toBeCloseTo(1.6, 5);
	expect(hits[1]?.why.path).toBe(1);
	// The breakdown reconstructs the score, so the ranking can be argued with.
	const w = top?.why ?? { lexical: 0, recency: 0, outcome: 0, path: 0, fuzzy: 0 };
	expect(top?.score).toBeCloseTo(w.lexical * w.recency * w.outcome * w.path, 5);
});

it("filters by project and kind and honours the limit", () => {
	const index = buildIndex([
		card({ id: "a", title: "retry hook", project: "other" }),
		card({ id: "b", title: "retry hook", kind: "doc" }),
		card({ id: "c", title: "retry hook" }),
	]);
	expect(idsOf(search(index, { text: "retry hook", project: "ah" }, { now: NOW }))).toEqual([
		"b",
		"c",
	]);
	expect(idsOf(search(index, { text: "retry hook", kinds: ["doc"] }, { now: NOW }))).toEqual(["b"]);
	expect(search(index, { text: "retry hook", limit: 1 }, { now: NOW })).toHaveLength(1);
	expect(search(index, { text: "nothing matches here" }, { now: NOW })).toEqual([]);
});

it("selectDiverse drops near-duplicates in favour of a different answer", () => {
	const index = buildIndex([
		card({ id: "dup1", title: "retry hook backoff" }),
		card({ id: "dup2", title: "retry hook backoff again" }),
		card({
			id: "doc",
			kind: "doc",
			title: "hook conventions",
			text: "the retry policy is described here at some length, longer than a commit subject",
		}),
	]);
	const hits = search(index, { text: "retry hook" }, { now: NOW });
	// By score alone the two near-identical commits own both slots …
	expect(idsOf(hits)).toEqual(["dup1", "dup2", "doc"]);
	// … and MMR trades the redundant twin for the card that says something else.
	expect(idsOf(selectDiverse(hits, 2))).toEqual(["dup1", "doc"]);
	expect(selectDiverse(hits, 9)).toHaveLength(3);
	expect(selectDiverse([], 3)).toEqual([]);
});
