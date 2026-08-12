/**
 * A compact BM25 over an in-memory inverted index. No stored vectors, no
 * service, no network: building it over a few thousand cards is milliseconds,
 * which is the whole point — retrieval has to be free enough to run on every
 * keystroke of a task description.
 *
 * Fields are collapsed into one posting list with boosted term frequencies
 * (BM25F-lite): a term in a title counts three times, in a path twice, in the
 * body once. That keeps one length normalisation and one posting list while
 * still saying that a commit *titled* "fix retry hook" is about retry hooks
 * and one that merely mentions it in a diff is not.
 */

import { tokenize } from "./tokenize.js";
import type { HistoryCard } from "./types.js";

const K1 = 1.2;
const B = 0.75;

/** title x3, paths x2, text x1. */
const FIELD_BOOST = { title: 3, paths: 2, text: 1 } as const;

export interface Posting {
	doc: number;
	/** Field-boosted term frequency. */
	tf: number;
}

export interface Bm25Index {
	cards: HistoryCard[];
	postings: Map<string, Posting[]>;
	/** Boosted length per document, for the b-normalisation. */
	lengths: number[];
	avgLength: number;
}

/** A query term and how much of its score survives (fuzzy terms weigh less). */
export interface WeightedTerm {
	term: string;
	weight: number;
	fuzzy?: boolean;
}

export interface DocScore {
	score: number;
	/** The part of `score` contributed by fuzzy-expanded terms. */
	fuzzy: number;
	/** Terms that actually hit this document, for highlighting. */
	terms: string[];
}

function count(into: Map<string, number>, text: string, boost: number): void {
	for (const term of tokenize(text)) into.set(term, (into.get(term) ?? 0) + boost);
}

export function buildIndex(cards: HistoryCard[]): Bm25Index {
	const postings = new Map<string, Posting[]>();
	const lengths: number[] = [];
	let total = 0;
	cards.forEach((card, doc) => {
		const counts = new Map<string, number>();
		count(counts, card.title, FIELD_BOOST.title);
		count(counts, card.paths.join(" "), FIELD_BOOST.paths);
		count(counts, card.text, FIELD_BOOST.text);
		let length = 0;
		for (const [term, tf] of counts) {
			length += tf;
			const list = postings.get(term);
			if (list === undefined) postings.set(term, [{ doc, tf }]);
			else list.push({ doc, tf });
		}
		lengths.push(length);
		total += length;
	});
	return { cards, postings, lengths, avgLength: cards.length > 0 ? total / cards.length : 1 };
}

export function documentFrequency(index: Bm25Index, term: string): number {
	return index.postings.get(term)?.length ?? 0;
}

/** Scores a pre-weighted term list; the seam fuzzy expansion plugs into. */
export function scoreTerms(index: Bm25Index, terms: WeightedTerm[]): Map<number, DocScore> {
	const out = new Map<number, DocScore>();
	const seen = new Set<string>();
	const n = Math.max(1, index.cards.length);
	const avg = index.avgLength > 0 ? index.avgLength : 1;
	for (const { term, weight, fuzzy } of terms) {
		if (seen.has(term)) continue;
		seen.add(term);
		const list = index.postings.get(term);
		if (list === undefined) continue;
		const idf = Math.log(1 + (n - list.length + 0.5) / (list.length + 0.5));
		for (const { doc, tf } of list) {
			const norm = 1 - B + (B * (index.lengths[doc] ?? avg)) / avg;
			const gain = ((idf * (tf * (K1 + 1))) / (tf + K1 * norm)) * weight;
			const hit = out.get(doc) ?? { score: 0, fuzzy: 0, terms: [] };
			hit.score += gain;
			if (fuzzy === true) hit.fuzzy += gain;
			hit.terms.push(term);
			out.set(doc, hit);
		}
	}
	return out;
}

/** Plain BM25 for a raw query string — no fuzzy expansion, no re-ranking. */
export function score(query: string, index: Bm25Index): Map<number, DocScore> {
	return scoreTerms(
		index,
		tokenize(query).map((term) => ({ term, weight: 1 })),
	);
}
