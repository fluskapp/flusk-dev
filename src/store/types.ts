/**
 * The frozen contract for the local fact store — the single shape through
 * which goal graphs and the unattended watch ledger read and write durable
 * state. Anything richer is built above this line out of `query`; nothing
 * below it is allowed to grow a third method.
 *
 * The store is bitemporal on purpose. A status change is recorded by closing
 * the previous value, not by mutating it, so history stays readable and a
 * concurrent reader never sees two live answers to a functional question. A
 * cooldown is recorded as a fact that stops being visible once its
 * `validUntil` passes, which makes TTL expiry and retry eligibility the same
 * event. An implementation that deleted facts on expiry, or that let a new
 * value coexist with the one it replaced, would silently corrupt goal status
 * and let an unattended loop retry the same item forever.
 */

/**
 * `active` is the only visible status. `candidate` is a low-confidence write
 * parked out of sight until something confirms it; `superseded` is a value
 * that a later assert closed. Both remain on disk and are readable by asking
 * for them explicitly.
 */
export type FactStatus = "active" | "candidate" | "superseded";

/** A stored fact. Timestamps are ISO-8601 UTC so string order is time order. */
export interface Fact {
	id: string;
	subject: string;
	predicate: string;
	object: string;
	/** Below 0.75 the fact is a Candidate and supersedes nothing. */
	confidence: number;
	source?: string;
	status: FactStatus;
	/** When the fact became true. */
	validFrom: string;
	/** When it stopped (or will stop) being true; null means open-ended. */
	validUntil: string | null;
	properties?: Record<string, unknown>;
}

/**
 * One assert. Omitted `confidence` means 1.0 (directly observed), omitted
 * `coexist` means the predicate is functional.
 */
export interface FactInput {
	subject: string;
	predicate: string;
	object: string;
	confidence?: number;
	source?: string;
	/**
	 * Multi-valued predicate: this assert is ADDED beside the existing values
	 * for the same (subject, predicate) instead of replacing them. Getting this
	 * flag backwards is not a visible error — it quietly loses either the new
	 * value or the old one.
	 */
	coexist?: boolean;
	/** TTL ephemera: a sweeper may hard-delete this row once validUntil passes. */
	transient?: boolean;
	/** ISO-8601. The fact is invisible to reads at or after this instant. */
	validUntil?: string;
	properties?: Record<string, unknown>;
}

/**
 * A compare-and-swap guard: passes when exactly one visible fact carries this
 * (subject, predicate) and its object is equal to `object`.
 */
export interface Compare {
	subject: string;
	predicate: string;
	object: string;
}

export interface QueryParams {
	subject?: string;
	predicate?: string;
	object?: string;
	/**
	 * One status or a comma-separated list ("active,candidate,superseded").
	 * Defaults to "active". Applied independently of `asOf`: a snapshot read
	 * that wants closed rows must ask for them by status as well.
	 */
	status?: string;
	/**
	 * Row cap, applied after filtering. Defaults to 200, and truncation drops
	 * the OLDEST rows — a read whose answer needs the whole namespace must ask
	 * for NO_LIMIT rather than trust a generous number.
	 */
	limit?: number;
	/** ISO-8601 or epoch milliseconds. Defaults to now. */
	asOf?: string | number;
}

export interface TransactResult {
	/** Monotonic per store; identifies the batch these asserts landed in. */
	tx: number;
	/** Ids of the resulting facts, in assert order. */
	ids: string[];
}

/**
 * Rejection when a guard does not hold. Callers distinguish a lost race from a
 * real failure by this `code`, so it must be exact.
 */
export interface CompareFailedError extends Error {
	code: "CompareFailed";
	failures: Compare[];
}

/**
 * Namespace-disciplined fact storage. `ns` scopes every call: a query never
 * returns a fact from another namespace, an assert never supersedes one, and a
 * compare never sees one. Both methods reject on failure; callers own
 * degradation.
 */
export interface FactStore {
	/**
	 * Facts visible in `ns` at `asOf`, matching every supplied filter. Visible
	 * means: status is one of `status`, `validFrom` is at or before `asOf`, and
	 * `validUntil` is null or strictly after `asOf`. Expired rows are hidden,
	 * never deleted, so a later snapshot read can still find them. Results come
	 * back oldest first and `limit` keeps the NEWEST rows, so a capped read
	 * answers about the present; a read that must be complete passes NO_LIMIT.
	 */
	query(ns: string, params: QueryParams): Promise<Fact[]>;

	/**
	 * Apply `asserts` atomically, and only if every compare in `compares`
	 * currently passes. A single failing compare rejects the whole call with
	 * CompareFailedError and writes nothing — this is what stops two workers
	 * from claiming the same task.
	 *
	 * Each assert lands as: confidence below 0.75 → Candidate, which supersedes
	 * nothing; an identical live fact (same object, source and confidence) →
	 * the existing row, unchanged, no duplicate; otherwise a new active fact
	 * which, unless `coexist` is set, closes every other active fact on the same
	 * (subject, predicate) by stamping their `validUntil` with the transact
	 * time and their status Superseded.
	 *
	 * `asserts` must be non-empty and must not touch the same
	 * (subject, predicate) twice — batch the second value into a later call.
	 */
	transact(ns: string, asserts: FactInput[], compares?: Compare[]): Promise<TransactResult>;
}
