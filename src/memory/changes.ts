/**
 * Client-side whats_changed: the abagraph server exposes no REST route for it.
 *
 * The obvious implementation — query `status: "superseded"` — does NOT work:
 * closing a fact sets its `valid_until`, and a default read returns only facts
 * with none (core/match.rs `valid_at_time`), so those rows are invisible.
 * Instead this diffs two *bitemporal snapshots*: what was live at the cutoff
 * versus what is live now. Anything in the old snapshot but not the new was
 * closed since; anything only in the new one appeared since.
 */
import type { MemFact, MemoryClient } from "./client-types.js";

export interface Changes {
	added: MemFact[];
	superseded: MemFact[];
}

export async function whatsChanged(
	client: MemoryClient,
	ns: string,
	sinceIso: string,
	nowMs: number = Date.now(),
): Promise<Changes> {
	const since = Date.parse(sinceIso);
	if (Number.isNaN(since)) throw new Error(`whatsChanged: invalid since timestamp "${sinceIso}"`);
	// Both snapshots must admit superseded rows: the status filter is applied
	// independently of `as_of`, so a fact that was live at the cutoff but has
	// since been closed carries status "superseded" and a default read would
	// drop it — losing exactly the half of the diff we came for.
	const status = "active,candidate,superseded";
	const [before, now] = await Promise.all([
		client.query(ns, { status, asOf: since, limit: 500 }),
		client.query(ns, { status, asOf: nowMs, limit: 500 }),
	]);
	const idsBefore = new Set(before.map((f) => f.id));
	const idsNow = new Set(now.map((f) => f.id));
	return {
		added: now.filter((f) => !idsBefore.has(f.id)),
		superseded: before.filter((f) => !idsNow.has(f.id)),
	};
}
