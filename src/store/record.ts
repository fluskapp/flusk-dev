/**
 * The two line shapes the log can hold, and the only parser for them.
 *
 * The log is append-only, so a supersession cannot edit the line it closes —
 * it is a later line that shadows it. Keeping the close as its own record is
 * what lets a reader reconstruct both the old value and the instant it stopped
 * being true; an implementation that rewrote the original line would destroy
 * the history that snapshot reads and the change feed are computed from.
 *
 * Parsing rejects a line rather than the file: a process killed mid-write
 * leaves a truncated tail, and one unreadable line must never cost the store.
 */
import type { Fact, FactStatus } from "./types.js";

/** A newly asserted fact. `transient` marks TTL ephemera a sweeper may drop. */
export interface FactRecord {
	k: "fact";
	tx: number;
	transient?: boolean;
	fact: Fact;
}

/** Closes an earlier fact: status becomes superseded, validUntil is stamped. */
export interface CloseRecord {
	k: "close";
	tx: number;
	id: string;
	validUntil: string;
}

export type StoreRecord = FactRecord | CloseRecord;

export function encode(records: StoreRecord[]): string {
	return records.map((r) => `${JSON.stringify(r)}\n`).join("");
}

/** null for any line that is not a whole, well-formed record. */
export function parseRecord(line: string): StoreRecord | null {
	let raw: unknown;
	try {
		raw = JSON.parse(line);
	} catch {
		return null;
	}
	if (typeof raw !== "object" || raw === null) return null;
	const r = raw as {
		k?: unknown;
		tx?: unknown;
		transient?: unknown;
		fact?: unknown;
		id?: unknown;
		validUntil?: unknown;
	};
	const tx = typeof r.tx === "number" ? r.tx : 0;
	if (r.k === "close") {
		if (typeof r.id !== "string" || typeof r.validUntil !== "string") return null;
		return { k: "close", tx, id: r.id, validUntil: r.validUntil };
	}
	if (r.k === "fact" && isFact(r.fact)) {
		return { k: "fact", tx, transient: r.transient === true, fact: r.fact };
	}
	return null;
}

const STATUSES: FactStatus[] = ["active", "candidate", "superseded"];

function isFact(v: unknown): v is Fact {
	if (typeof v !== "object" || v === null) return false;
	const f = v as Partial<Fact>;
	const strings = [f.id, f.subject, f.predicate, f.object, f.validFrom];
	if (strings.some((s) => typeof s !== "string")) return false;
	if (typeof f.confidence !== "number") return false;
	if (!STATUSES.includes(f.status as FactStatus)) return false;
	return f.validUntil === null || typeof f.validUntil === "string";
}
