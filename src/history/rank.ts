/**
 * The composite ranker. Lexical match is table stakes — grep has that. What
 * this adds is what grep cannot know: how the work ENDED, how long ago it
 * happened, and whether it touched the files this task names.
 *
 * Recency and outcome are TIE-BREAKS, and the size of the tie they may break is
 * the whole design. Measured against the golden set (test/history-eval), the
 * old weights — recency up to +35%, outcome 0.8x–1.3x — made the composite
 * WORSE than the plain BM25 it wraps (top-3 96.2% vs 100%, MRR 0.833 vs 0.846):
 * a 2.2x spread between the best and worst multiplier reorders hits whose
 * lexical scores are nowhere near each other, so a card was demoted for being
 * `blocked` by a query that asked what was blocked. Bounded to TIE_BAND they
 * can only decide a near-tie, which is the claim this file has always made for
 * them. The eval asserts the bound holds: a signal that scores worse than its
 * own ablation fails the build.
 *
 * Outcome stays a PARAMETER, and that is where it earns its keep: failures are
 * not buried, and asking for them (`outcomeWeights: { failed: 2 }`) is how the
 * walkthrough mines traps.
 *
 * `score = lexical * recency * outcome * path * kindBoost(card.kind)`, and
 * every part rides on the hit, so a ranking can be argued with rather than
 * trusted. (`kindBoost` is caller-supplied and has no field in the frozen
 * ScoreParts; it is the one factor the caller already knows.)
 */
import { basename } from "node:path";
import type { Bm25Index } from "./bm25.js";
import { scoreTerms } from "./bm25.js";
import { expandQuery } from "./fuzzy.js";
import { queryTerms } from "./tokenize.js";
import type { CardKind, HistoryCard, Outcome, SearchHit, SearchQuery } from "./types.js";

export { selectDiverse } from "./diverse.js";

/**
 * How far apart two lexical scores may be before a tie-break stops mattering.
 * Recency and outcome together span at most (1 + TIE_BAND/2) * (1 + TIE_BAND),
 * so a clearly better lexical match cannot be overturned by either.
 */
const TIE_BAND = 0.04;

/**
 * Verified precedent is what you copy; a failure is a warning, not noise —
 * which is why the weights are ASYMMETRIC. A good ending earns a real (if
 * small) boost, a bad ending is barely demoted at all: measured, the demotion
 * only ever cost accuracy, because the queries that mention a failure
 * ("the gate blocked the run") are precisely the ones whose answer is a
 * blocked card. Ordering is still strict, so `verified` beats an otherwise
 * identical `failed`, and a caller that wants failures asks for them.
 */
export const OUTCOME_WEIGHTS: Record<Outcome, number> = {
	verified: 1 + TIE_BAND,
	shipped: 1 + TIE_BAND / 2,
	unknown: 1,
	blocked: 1 - TIE_BAND / 8,
	failed: 1 - TIE_BAND / 4,
};

export interface RankOptions {
	now?: number;
	halfLifeDays?: number;
	/** Cap on the recency multiplier: the most a fresh card can gain. */
	recencyWeight?: number;
	outcomeWeights?: Partial<Record<Outcome, number>>;
	kindBoost?: Partial<Record<CardKind, number>>;
	pathWeight?: number;
}

const DEFAULT_LIMIT = 20;

function recencyPart(at: string, opts: RankOptions): number {
	const weight = opts.recencyWeight ?? TIE_BAND / 2;
	const parsed = Date.parse(at);
	if (Number.isNaN(parsed)) return 1;
	const ageDays = Math.max(0, ((opts.now ?? Date.now()) - parsed) / 86_400_000);
	return 1 + weight * 0.5 ** (ageDays / (opts.halfLifeDays ?? 180));
}

function outcomePart(outcome: Outcome, opts: RankOptions): number {
	return opts.outcomeWeights?.[outcome] ?? OUTCOME_WEIGHTS[outcome];
}

/**
 * A path matches when one is a suffix of the other AT A SEGMENT BOUNDARY, or
 * the basenames agree. Bare containment made wanted "types.ts" match
 * "src/mytypes.ts" and "history.ts" match "src/ui/api-history.ts", handing an
 * unrelated file the full path multiplier.
 */
function touches(cardPath: string, wanted: string): boolean {
	const a = cardPath.toLowerCase();
	const b = wanted.toLowerCase();
	if (a === b || a.endsWith(`/${b}`) || b.endsWith(`/${a}`)) return true;
	return basename(a) === basename(b);
}

function pathPart(card: HistoryCard, wanted: string[] | undefined, opts: RankOptions): number {
	if (wanted === undefined || wanted.length === 0) return 1;
	const hits = wanted.filter((w) => card.paths.some((p) => touches(p, w))).length;
	return 1 + (opts.pathWeight ?? 0.6) * (hits / wanted.length);
}

/** 1 when any part of the score came from a term the card really contains. */
const exactness = (hit: SearchHit): number => (hit.why.lexical - hit.why.fuzzy > 1e-9 ? 1 : 0);

function selected(card: HistoryCard, query: SearchQuery): boolean {
	if (query.project !== undefined && card.project !== query.project) return false;
	return query.kinds === undefined || query.kinds.includes(card.kind);
}

export function search(index: Bm25Index, query: SearchQuery, opts: RankOptions = {}): SearchHit[] {
	const terms = expandQuery(index, queryTerms(query.text));
	const hits: SearchHit[] = [];
	for (const [doc, scored] of scoreTerms(index, terms)) {
		const card = index.cards[doc];
		if (card === undefined || !selected(card, query)) continue;
		const why = {
			lexical: scored.score,
			recency: recencyPart(card.at, opts),
			outcome: outcomePart(card.outcome, opts),
			path: pathPart(card, query.paths, opts),
			fuzzy: scored.fuzzy,
		};
		const kind = opts.kindBoost?.[card.kind] ?? 1;
		hits.push({
			card,
			score: why.lexical * why.recency * why.outcome * why.path * kind,
			why,
			terms: scored.terms,
		});
	}
	// Exactness is a TIER, not a weight. A term-level penalty cannot bound a
	// document-level comparison: BM25 tf saturation lets a high-tf hit on a
	// slightly commoner neighbour out-earn a low-tf hit on the very rare term
	// the user actually typed. Measured on the real 2641-card index, 32 queries
	// put a card that does not contain the term at rank 1 — every one of them
	// scored entirely on expansions. A card that contains the query term always
	// comes first; the expansions are what fills the rest of the page.
	hits.sort(
		(a, b) =>
			exactness(b) - exactness(a) || b.score - a.score || a.card.id.localeCompare(b.card.id),
	);
	return hits.slice(0, Math.max(0, query.limit ?? DEFAULT_LIMIT));
}
