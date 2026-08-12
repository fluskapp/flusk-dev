/**
 * Retrieval quality, measured rather than asserted anecdotally.
 *
 * The other history tests each check one mechanism — title beats body, fuzzy
 * fires only when postings are scarce, a gate stage becomes `blocked`. All can
 * pass while the thing a caller actually asks for ("give me the card that
 * answers this") is wrong: quality lives in how the parts COMBINE. So this file
 * asks that question 26 times and reports a number.
 *
 * The golden set is test/fixtures/history-golden.json: a corpus shaped like the
 * real one, plus (query -> expected id) pairs whose `why` argues the label from
 * the corpus. Labels were written before measuring; one revised to match the
 * ranker's output would make this an expensive way to assert `true`.
 *
 * FIX THE RANKER, NOT THE NUMBER: lowering a threshold to green the suite
 * deletes the only signal this file produces. The report names what missed.
 */
import { expect, it } from "vitest";
import type { HistoryCard } from "../src/features/history/types.js";
import { ABLATIONS, FLAT, FX, ids, measure, report, run } from "./history-eval-harness.js";

const TWIN = "wire the budget guard into the agent loop";

function hitOf(hits: ReturnType<typeof run>, id: string): (typeof hits)[number] {
	const hit = hits.find((h) => h.card.id === id);
	if (hit === undefined) throw new Error(`never retrieved: ${id}`);
	return hit;
}

it("the golden set is well-formed: unique ids, real targets, every facet covered", () => {
	const cardIds = new Set(FX.cards.map((c) => c.id));
	expect(cardIds.size).toBe(FX.cards.length);
	expect(FX.golden.length).toBeGreaterThanOrEqual(20);
	expect(new Set(FX.golden.map((c) => c.id)).size).toBe(FX.golden.length);
	for (const c of FX.golden) expect(cardIds.has(c.expected), `${c.id} -> ${c.expected}`).toBe(true);
	// The mix is the point: one kind, or one ending, would measure nothing.
	expect(new Set(FX.cards.map((c) => c.kind)).size).toBe(5);
	expect(new Set(FX.cards.map((c) => c.outcome)).size).toBe(5);
	const facets = new Set(FX.golden.map((c) => c.facet));
	for (const f of FX.facets) expect(facets.has(f), `facet covered: ${f}`).toBe(true);
	// Near-identical journals are most of the real corpus; without them the set
	// cannot see the failure mode that dominates it.
	const titles = FX.cards.filter((c) => c.kind === "journal").map((c) => c.title);
	expect(titles.length - new Set(titles).size).toBeGreaterThanOrEqual(10);
});

it("retrieves the right card: top-3 >= 0.80 and MRR >= 0.65 over the golden set", () => {
	const m = measure();
	const text = report(m);
	console.log(`\nhistory retrieval eval\n${text}\n`); // printed on pass too
	expect(m.top3, `top-3 accuracy too low\n${text}`).toBeGreaterThanOrEqual(0.8);
	expect(m.mrr, `MRR too low\n${text}`).toBeGreaterThanOrEqual(0.65);
});

/**
 * The ablation is not decoration either. A composite that scores WORSE than a
 * factor turned off is not a ranker with a signal in it, it is plain BM25
 * carrying a passenger — which is exactly what recency (+35%) and outcome
 * (0.8x–1.3x) were when they could reorder hits that were not close.
 */
it("is at least as good as every ablation of itself — no factor may cost accuracy", () => {
	const m = measure();
	const text = report(m);
	for (const [name, opts] of Object.entries(ABLATIONS)) {
		const off = measure(opts);
		expect(m.mrr, `"${name}" beats the full ranker on MRR\n${text}`).toBeGreaterThanOrEqual(
			off.mrr - 1e-9,
		);
		expect(m.top3, `"${name}" beats the full ranker on top-3\n${text}`).toBeGreaterThanOrEqual(
			off.top3 - 1e-9,
		);
	}
});

/** Twins differ in nothing but outcome, so any gap IS the outcome signal. */
it("a verified card outranks an otherwise-identical failed one", () => {
	const { verified, failed } = FX.twins;
	const twins = FX.cards.filter((c) => c.id === verified || c.id === failed);
	const [x, y] = twins as [HistoryCard, HistoryCard];
	expect([x.title, x.text, x.at, x.paths]).toEqual([y.title, y.text, y.at, y.paths]);
	expect(new Set([x.outcome, y.outcome])).toEqual(new Set(["verified", "failed"]));
	const hits = run({ query: TWIN }, {});
	const v = hitOf(hits, verified);
	const f = hitOf(hits, failed);
	// The gap is attributable: same lexical hit, different outcome multiplier.
	expect(v.why.lexical).toBeCloseTo(f.why.lexical, 10);
	expect(v.why.outcome).toBeGreaterThan(f.why.outcome);
	expect(v.score).toBeGreaterThan(f.score);
	expect(ids(hits).indexOf(verified)).toBeLessThan(ids(hits).indexOf(failed));
});

it("the failed twin is still retrievable when the caller asks for failures", () => {
	const { verified, failed } = FX.twins;
	const asked = ids(
		run({ query: TWIN }, { outcomeWeights: { ...FLAT, failed: 2.2, verified: 0.3 } }),
	);
	expect(asked).toContain(failed);
	expect(asked.indexOf(failed)).toBeLessThan(asked.indexOf(verified));
	// Burying is the other failure mode: under DEFAULT weights a failure must
	// still be reachable, not merely re-rankable once you suspect it exists.
	expect(ids(run({ query: TWIN }, {}))).toContain(failed);
});
