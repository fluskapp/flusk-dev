/**
 * Compaction of TTL ephemera, for maintenance rather than for reads.
 *
 * Cooldowns and other transient rows would otherwise grow the `flusk` log without
 * bound. Only rows explicitly marked transient AND already past their
 * `validUntil` may go: sweeping early would delete a fact that readers still
 * have to see, and sweeping a durable row would erase history no append can
 * rebuild. Nothing here changes what a read returns — expiry is decided from
 * the stored timestamp, so a row's removal is invisible by the time it happens.
 *
 * The rewrite replaces the file a writer would be appending to, so it takes
 * the same lock a transact does: a batch landing mid-sweep would be written
 * into the log the rename is about to discard.
 */
import { withLock } from "./lock.repository.js";
import { readLog, writeLog } from "./log.repository.js";
import { materialize } from "./materialize.js";
import { nsPath, storeDir } from "./paths.js";

/** Hard-deletes expired transient rows from `ns`; returns how many went. */
export async function sweepTransient(
	ns: string,
	at: number = Date.now(),
	dir: string = storeDir(),
): Promise<number> {
	const path = nsPath(dir, ns);
	return withLock(path, async () => {
		const records = await readLog(path);
		const doomed = new Set<string>();
		for (const row of materialize(records)) {
			if (!row.transient || row.fact.validUntil === null) continue;
			const until = Date.parse(row.fact.validUntil);
			if (Number.isFinite(until) && until <= at) doomed.add(row.fact.id);
		}
		if (doomed.size === 0) return 0;
		const kept = records.filter((r) => !doomed.has(r.k === "fact" ? r.fact.id : r.id));
		await writeLog(path, kept);
		return doomed.size;
	});
}
