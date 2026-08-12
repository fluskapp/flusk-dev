/**
 * One number per ranked item, comparable across sources.
 *
 * Each source scores on its own scale and says so in its own header: house
 * rules are 0-100 "how strongly this constrains the work", history is 0..1
 * "what the run loses if this is dropped", profile is 0..1 but deliberately
 * ceilinged at 0.44, runs is 0..1 by role. Packed together untouched, the
 * house-rules source would win every slot in the budget by a factor of a
 * hundred and the block would be nothing but rules — the same failure as a
 * builder that is all commits and no code, in the other direction.
 *
 * So: divide by the source's DECLARED maximum to get 0..1, then multiply by a
 * WEIGHT that says what a top item from that source is worth against a top
 * item from another. The weights are a judgement, written down where they can
 * be argued with:
 *
 *   history 1.00  the only source that knows this was tried before and how it
 *                 ended; a trap is the single most expensive thing to relearn.
 *   runs    0.95  same class of fact for a resume, but scoped to one prior run.
 *   house-  0.90  binding, but the binding ones are already PINNED; what is
 *   rules         ranked here is the second tier of rules documents.
 *   profile 0.55  orientation that is true every run. Useful, never urgent —
 *                 it must not outrank a specific precedent, and at 0.55 its
 *                 own 0.44 ceiling puts it below history's floor band.
 *
 * A source with no declared scale is normalised against the highest score it
 * itself produced in THIS build (deterministic for a fixed corpus) and given
 * the conservative unknown weight: an unregistered source can under-claim
 * budget, never flood it.
 */
import type { ContextItem } from "./types.js";

export interface Scale {
	/** The top of the source's own documented range. */
	max: number;
	/** What a top item from this source is worth against another's. */
	weight: number;
}

const DECLARED: Record<string, Scale> = {
	history: { max: 1, weight: 1.0 },
	runs: { max: 1, weight: 0.95 },
	"house-rules": { max: 100, weight: 0.9 },
	profile: { max: 1, weight: 0.55 },
	// Pinned by construction; present so an unpinned variant is not "unknown".
	workspace: { max: 1, weight: 0.6 },
	verify: { max: 1, weight: 0.6 },
};

const UNKNOWN_WEIGHT = 0.4;

/** Ranked items only: a pinned item never competes, so its rank is 0 (inv. 11). */
export type Ranker = (item: ContextItem) => number;

const clamp = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Ranks against the scales, resolving unknown sources from the items in hand.
 * Built once per build so every comparison in it uses the same denominators.
 */
export function makeRanker(items: readonly ContextItem[]): Ranker {
	const observed = new Map<string, number>();
	for (const item of items) {
		if (DECLARED[item.source] !== undefined) continue;
		observed.set(item.source, Math.max(observed.get(item.source) ?? 0, item.score));
	}
	return (item: ContextItem): number => {
		if (item.tier === "pinned") return 0;
		const declared = DECLARED[item.source];
		if (declared !== undefined) return clamp(item.score / declared.max) * declared.weight;
		const max = observed.get(item.source) ?? 0;
		return (max <= 0 ? 0 : clamp(item.score / max)) * UNKNOWN_WEIGHT;
	};
}

/** Total order for ranked items: rank first, `id` as the final tie-break (L5). */
export function byRank(rank: Ranker): (a: ContextItem, b: ContextItem) => number {
	return (a, b) => rank(b) - rank(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}
