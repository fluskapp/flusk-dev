/**
 * The ledger every capped query reports from. It exists so that "the answer is
 * a floor" is a value the caller receives rather than a fact only the query
 * knew: a capped list returned bare reads as a complete one, and the reader
 * then plans against three impacted files when there were thirty.
 *
 * `cmp` lives here because ordering is what makes two identical answers
 * compare equal. `localeCompare` would sort by the machine's locale, so the
 * same graph could rank differently on two developers' laptops.
 */
import type { Truncation, TruncationReason } from "./query-types.js";

/** Codepoint order, locale-independent (see the header). */
export function cmp(a: string, b: string): number {
	return a < b ? -1 : a > b ? 1 : 0;
}

/** Accumulates the caps that bit, so a report can say the answer is a floor. */
export interface Tracker {
	hit(reason: TruncationReason): void;
	/** Count rows known to have qualified and been dropped. */
	drop(n: number): void;
	done(): Truncation;
}

export function tracker(): Tracker {
	const reasons = new Set<TruncationReason>();
	let dropped = 0;
	return {
		hit: (r) => void reasons.add(r),
		drop: (n) => {
			dropped += n;
		},
		done: () => ({
			truncated: reasons.size > 0,
			reasons: [...reasons].sort(cmp),
			dropped,
		}),
	};
}

/** Merge ledgers when one answer is assembled from several walks/reads. */
export function mergeTruncation(parts: Truncation[]): Truncation {
	const reasons = new Set<TruncationReason>();
	let dropped = 0;
	for (const p of parts) {
		for (const r of p.reasons) reasons.add(r);
		dropped += p.dropped;
	}
	return { truncated: reasons.size > 0, reasons: [...reasons].sort(cmp), dropped };
}
