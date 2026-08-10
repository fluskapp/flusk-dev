/**
 * Client-side whats_changed: the abagraph server exposes no REST route for
 * it, so hit reimplements the split — active facts that appeared since the
 * cutoff vs facts closed (superseded) since it — from two status-filtered
 * queries over the one namespace.
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
): Promise<Changes> {
	const since = Date.parse(sinceIso);
	if (Number.isNaN(since)) throw new Error(`whatsChanged: invalid since timestamp "${sinceIso}"`);
	const [active, closed] = await Promise.all([
		client.query(ns, { status: "active" }),
		client.query(ns, { status: "superseded" }),
	]);
	const at = (iso: string | null | undefined) =>
		iso == null ? Number.NEGATIVE_INFINITY : Date.parse(iso);
	return {
		added: active.filter((f) => at(f.validFrom) >= since),
		superseded: closed.filter((f) => at(f.validUntil) >= since),
	};
}
