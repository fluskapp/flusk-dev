/**
 * The single definition of "visible", shared by reads and by compare-and-swap.
 *
 * A guard that judged visibility differently from a query is how two workers
 * end up claiming the same task: one of them would test its compare against
 * rows the other could not see. Keeping one rule here is what makes the guard
 * mean what the caller read a moment earlier.
 *
 * Expiry is decided from the stored timestamp, never from a row's presence:
 * a fact past its `validUntil` stays on disk, and its invisibility IS the
 * event a cooldown waits for.
 */
import type { Fact } from "./types.js";

/** Row cap when the caller names none. Truncation drops the oldest rows. */
export const DEFAULT_LIMIT = 200;

/**
 * The cap for a read whose answer is wrong unless it sees every row: a goal
 * graph's statuses, a change feed's two snapshots. Truncating those does not
 * degrade the answer, it inverts it — a finished goal reads as unfinished and
 * a change feed reports nothing changed, neither with any error to notice.
 */
export const NO_LIMIT = Number.MAX_SAFE_INTEGER;

/** Statuses a read admits when the caller names none. */
const DEFAULT_STATUS = "active";

/** ISO-8601 or epoch milliseconds; absent means now. */
export function atMs(asOf?: string | number): number {
	if (asOf === undefined) return Date.now();
	if (typeof asOf === "number") return asOf;
	const ms = Date.parse(asOf);
	if (Number.isNaN(ms)) throw new Error(`query: unparseable asOf "${asOf}"`);
	return ms;
}

/** "active,candidate" -> the set to admit. Independent of `asOf`. */
export function statusSet(status?: string): Set<string> {
	const parts = (status ?? DEFAULT_STATUS)
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s !== "");
	return new Set(parts);
}

/**
 * True when the fact had started and had not stopped at `at`. An unreadable
 * timestamp keeps the fact visible: losing a row is worse than showing one,
 * and the alternative hides state no operator can find again.
 */
export function visibleAt(f: Fact, at: number): boolean {
	const from = Date.parse(f.validFrom);
	if (Number.isFinite(from) && from > at) return false;
	if (f.validUntil === null) return true;
	const until = Date.parse(f.validUntil);
	return !Number.isFinite(until) || until > at;
}
