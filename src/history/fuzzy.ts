/**
 * Typo tolerance that does not turn into "everything matches".
 *
 * Two gates, in this order, because either alone is useless: trigram overlap
 * against the vocabulary generates candidates cheaply (no scan of the whole
 * term list per query term), then a *bounded* edit distance rejects the ones
 * that merely share letters. And it only fires when the term has almost no
 * exact postings.
 *
 * Expanded terms carry a penalty weight — but a weight is not a guarantee, and
 * this file cannot make one: BM25 saturation lets a strong hit on a commoner
 * neighbour out-earn a weak hit on the rare term the user actually typed. The
 * guarantee lives in rank.ts, which sorts every card containing a query term
 * above every card that only matched an expansion.
 */
import { type Bm25Index, documentFrequency, type WeightedTerm } from "./bm25.js";
import { editDistance } from "./edit-distance.js";
import { trigrams } from "./tokenize.js";

export { editDistance } from "./edit-distance.js";

export interface FuzzyOptions {
	/** Expand only a term with at most this many exact postings. */
	maxExactPostings?: number;
	/** Dice coefficient over trigrams a candidate must clear. */
	minOverlap?: number;
	/** How many expansions a single term may contribute. */
	maxCandidates?: number;
	/** Weight of a distance-1 expansion; distance-2 gets half of it. */
	penalty?: number;
}

/**
 * `minOverlap: 0.4` is what a transposition costs a short word — "retyr"
 * shares only 0.400 of its trigrams with "retry", so at 0.45 the commonest
 * typo class could never be corrected however cheap its edit distance was.
 *
 * Expanding a term with one posting is deliberate recall (the near-miss card
 * is still worth showing), and it is safe because the guarantee lives one
 * level up: rank.ts sorts every card that contains a query term ABOVE every
 * card that only matched an expansion, whatever the scores say.
 */
const DEFAULTS: Required<FuzzyOptions> = {
	maxExactPostings: 1,
	minOverlap: 0.4,
	maxCandidates: 3,
	penalty: 0.35,
};

/**
 * A gram shared by this much of the vocabulary discriminates nothing; walking
 * it would cost more than the whole query. Skipping it can only lose
 * candidates that a rarer gram of the same term also finds.
 */
const MAX_BUCKET = 4000;

/** Trigram → vocabulary terms, built once per index (indexes are immutable). */
const gramCache = new WeakMap<Bm25Index, Map<string, string[]>>();

function gramIndex(index: Bm25Index): Map<string, string[]> {
	const cached = gramCache.get(index);
	if (cached !== undefined) return cached;
	const map = new Map<string, string[]>();
	for (const term of index.postings.keys()) {
		for (const gram of new Set(trigrams(term))) {
			const bucket = map.get(gram);
			if (bucket === undefined) map.set(gram, [term]);
			else bucket.push(term);
		}
	}
	gramCache.set(index, map);
	return map;
}

/** Expansions for one term, best first; empty when the term needs no help. */
export function expandTerm(
	index: Bm25Index,
	term: string,
	options: FuzzyOptions = {},
): WeightedTerm[] {
	const opts = { ...DEFAULTS, ...options };
	if (documentFrequency(index, term) > opts.maxExactPostings) return [];
	const max = term.length <= 5 ? 1 : 2;
	const grams = new Set(trigrams(term));
	const shared = new Map<string, number>();
	const buckets = gramIndex(index);
	for (const gram of grams) {
		const bucket = buckets.get(gram);
		if (bucket === undefined || bucket.length > MAX_BUCKET) continue;
		for (const other of bucket) shared.set(other, (shared.get(other) ?? 0) + 1);
	}
	const scored: { term: string; distance: number; overlap: number }[] = [];
	for (const [candidate, hits] of shared) {
		if (candidate === term) continue;
		const overlap = (2 * hits) / (grams.size + trigrams(candidate).length);
		if (overlap < opts.minOverlap) continue;
		const distance = editDistance(term, candidate, max);
		if (distance > max) continue;
		scored.push({ term: candidate, distance, overlap });
	}
	scored.sort((a, b) => a.distance - b.distance || b.overlap - a.overlap);
	return scored
		.slice(0, opts.maxCandidates)
		.map((c) => ({ term: c.term, weight: opts.penalty / c.distance, fuzzy: true }));
}

/**
 * Exact terms at full weight, then penalised expansions for the weak ones.
 * Exact-first ordering is load-bearing: a term another query word expands to
 * must keep its full weight rather than be capped at the penalty.
 */
export function expandQuery(
	index: Bm25Index,
	terms: string[],
	options: FuzzyOptions = {},
): WeightedTerm[] {
	const exact = new Set(terms);
	const out: WeightedTerm[] = terms.map((term) => ({ term, weight: 1 }));
	for (const term of terms) {
		for (const expansion of expandTerm(index, term, options)) {
			if (!exact.has(expansion.term)) out.push(expansion);
		}
	}
	return out;
}
