/**
 * Folding the log into rows: the point where "what was written" becomes "what
 * is stored". Visibility is deliberately NOT decided here — that depends on
 * the read's `asOf`, and baking it in would make a snapshot read impossible.
 *
 * A close applied here can only ever shorten a fact's life. Letting one extend
 * it would resurrect a value that a reader had already stopped seeing, which
 * is the one thing a bitemporal log must never do.
 */
import type { StoreRecord } from "./record.js";
import type { Fact } from "./types.js";

/** A stored row: the fact plus the flags that live outside its shape. */
export interface Stored {
	fact: Fact;
	transient: boolean;
}

export function materialize(records: StoreRecord[]): Stored[] {
	const byId = new Map<string, Stored>();
	const order: Stored[] = [];
	for (const r of records) {
		if (r.k === "fact") {
			if (byId.has(r.fact.id)) continue;
			const row: Stored = { fact: { ...r.fact }, transient: r.transient === true };
			byId.set(r.fact.id, row);
			order.push(row);
			continue;
		}
		// A close whose fact has been compacted away is dropped, not an error.
		const row = byId.get(r.id);
		if (!row) continue;
		row.fact.status = "superseded";
		const current = row.fact.validUntil;
		row.fact.validUntil = current !== null && current < r.validUntil ? current : r.validUntil;
	}
	return order;
}

/** Highest transaction number in the log; 0 for an empty one. */
export function lastTx(records: StoreRecord[]): number {
	let max = 0;
	for (const r of records) if (r.tx > max) max = r.tx;
	return max;
}
