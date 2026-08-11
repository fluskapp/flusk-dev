/**
 * What moved in a namespace since a given instant, as a diff of two
 * bitemporal snapshots.
 *
 * The obvious implementation — query `status: "superseded"` — does NOT work:
 * closing a fact stamps its `validUntil`, and a live read returns only facts
 * whose `validUntil` is still open, so those rows are invisible. This asks the
 * store what was visible AT the cutoff and what is visible NOW instead.
 * Anything in the old snapshot but not the new was closed since; anything only
 * in the new one appeared since. Without this, a resume brief would report
 * every change as an addition and never once say a value was replaced.
 */
import type { Fact, FactStore } from "./types.js";
import { NO_LIMIT } from "./visibility.js";

export interface Changes {
	added: Fact[];
	superseded: Fact[];
}

export async function whatsChanged(
	store: FactStore,
	ns: string,
	sinceIso: string,
	nowMs: number = Date.now(),
): Promise<Changes> {
	const since = Date.parse(sinceIso);
	if (Number.isNaN(since)) throw new Error(`whatsChanged: invalid since timestamp "${sinceIso}"`);
	// Both snapshots must admit closed rows: the status filter is applied
	// independently of `asOf`, so a fact that was live at the cutoff but has
	// since been closed carries status "superseded" and a default read would
	// drop it — losing exactly the half of the diff we came for.
	const status = "active,candidate,superseded";
	// Both snapshots are read whole. A diff of two truncated pages is not a
	// smaller diff, it is a false one: the rows a cap drops are missing from
	// one side only, so a namespace past the cap reports nothing added while a
	// goal is being planned and worked, and reports rows superseded that are
	// still live.
	const [before, now] = await Promise.all([
		store.query(ns, { status, asOf: since, limit: NO_LIMIT }),
		store.query(ns, { status, asOf: nowMs, limit: NO_LIMIT }),
	]);
	const idsBefore = new Set(before.map((f) => f.id));
	const idsNow = new Set(now.map((f) => f.id));
	return {
		added: now.filter((f) => !idsBefore.has(f.id)),
		superseded: before.filter((f) => !idsNow.has(f.id)),
	};
}
