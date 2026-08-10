/**
 * Client-side budget trimming, mirroring abagraph core/rank.rs.
 *
 * ah cannot let the server apply the token budget: without a tenant scope
 * (see wire.ts NS_PROP) the server would spend the budget on other
 * namespaces' facts before ah filters them out. It still ranks by
 * confidence, so ah trims the ranked survivors with the same arithmetic.
 */
import type { MemFact } from "./client-types.js";

/** Ranked rows fetched before namespace filtering, so a busy neighbouring
 * namespace cannot crowd this one out of the response. */
export const CONTEXT_FETCH_CAP = 500;

/** core/rank.rs estimate_chars → ceil(chars / 4). */
export function factTokens(f: MemFact): number {
	const chars =
		f.subject.length + f.predicate.length + f.object.length + (f.source?.length ?? 0) + 4;
	return Math.ceil(chars / 4);
}

/** Greedy confidence-ordered trim, mirroring core/rank.rs rank_by_budget. */
export function trimToBudget(facts: MemFact[], budget: number | undefined): MemFact[] {
	if (budget === undefined || budget <= 0) return facts;
	const out: MemFact[] = [];
	let used = 0;
	for (const f of facts) {
		const t = factTokens(f);
		if (used + t > budget) continue;
		used += t;
		out.push(f);
	}
	return out;
}
