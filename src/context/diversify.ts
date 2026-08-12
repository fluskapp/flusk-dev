/**
 * Ten near-identical blocks are one fact, billed ten times.
 *
 * The corpus is full of restatements: four commits from one afternoon, a rules
 * document that repeats the root AGENTS.md, a run digest that says what the
 * run's own state block already said. Ranked purely by score they arrive as a
 * run of near-duplicates at the top of the block, and each one costs its
 * neighbours' place in the budget.
 *
 * `selectDiverse` (src/history/diverse.ts) is the project's answer to exactly
 * this and it is reused whole — a second similarity measure here would be one
 * more thing to disagree with the first. It wants SearchHits, so each item is
 * dressed as a card: `id` for its memo key, title and body for the token
 * overlap, and a KIND standing in for its source, because MMR also penalises
 * sameness of kind.
 *
 * Two steps, in this order, and the order matters:
 *
 *  1. MMR over the WHOLE pool, taking everything. Nothing is dropped here;
 *     what is produced is an ORDER in which each item is the one that adds
 *     most beyond everything before it, across sources as well as within one.
 *  2. That order is walked with a PER-SOURCE cap. A global cap would let the
 *     source with four hundred candidates spend the diversity allowance too,
 *     and the small source that had three things to say would never reach the
 *     floors that exist to protect it — the flood, arriving one step early.
 *
 * The pool is sorted before selection: MMR's greedy loop breaks ties on input
 * position, so an unsorted pool would let discovery order reach the output (L5).
 */
import { selectDiverse } from "../history/diverse.js";
import type { CardKind, HistoryCard, SearchHit } from "../history/types.js";
import { byRank, type Ranker } from "./normalise.js";
import type { ContextItem } from "./types.js";

/**
 * Beyond eight blocks from one source the block is a library, not a briefing:
 * the ninth commit teaches nothing the first eight did not, and a source's
 * floor will not stretch to eight in any budget a run has been given anyway.
 */
export const PER_SOURCE_KEEP = 8;

/** One kind per source, so same-source items carry MMR's sameness penalty. */
const KIND: Record<string, CardKind> = {
	history: "commit",
	runs: "session",
	"house-rules": "doc",
	profile: "skill",
	workspace: "journal",
	verify: "journal",
};

const asHit = (item: ContextItem, score: number): SearchHit => {
	const card: HistoryCard = {
		id: item.id,
		kind: KIND[item.source] ?? "doc",
		project: item.source,
		title: item.title,
		text: item.body,
		at: "",
		paths: item.path === undefined ? [] : [item.path],
		outcome: "unknown",
		ref: item.id,
	};
	return { card, score, why: { lexical: 0, recency: 0, outcome: 0, path: 0, fuzzy: 0 }, terms: [] };
};

export interface Diversified {
	/** In MMR order — complementary first, not merely highest-scoring. */
	kept: ContextItem[];
	/** Restatements: ranked below their own source's cap by marginal value. */
	dropped: ContextItem[];
}

/** Splits ranked candidates into the complementary set and the restatements. */
export function diversify(items: readonly ContextItem[], rank: Ranker): Diversified {
	const pool = [...items].sort(byRank(rank));
	if (pool.length <= 1) return { kept: [...pool], dropped: [] };
	const byId = new Map(pool.map((item) => [item.id, item]));
	const ordered = selectDiverse(
		pool.map((item) => asHit(item, rank(item))),
		pool.length,
	);
	const kept: ContextItem[] = [];
	const dropped: ContextItem[] = [];
	const perSource = new Map<string, number>();
	for (const hit of ordered) {
		const item = byId.get(hit.card.id);
		if (item === undefined) continue;
		const seen = perSource.get(item.source) ?? 0;
		perSource.set(item.source, seen + 1);
		if (seen < PER_SOURCE_KEEP) kept.push(item);
		else dropped.push(item);
	}
	return { kept, dropped };
}
