/**
 * The FactStore itself: an append-only JSONL log per namespace, with
 * visibility computed on every read.
 *
 * Reads never take a lock, but a transact is a read-modify-append across
 * awaits. Two of them running loose on one namespace would evaluate their
 * guards against the same state and both win, which is precisely the race
 * compare-and-swap exists to lose. Writes to a namespace are therefore
 * serialized twice over — by a promise queue within this process, and by a
 * lock file against every other one — and the guards are evaluated inside
 * that turn, against the log as it stands at that moment.
 *
 * `tx` is read back from the log rather than kept only in memory, so numbers
 * stay ascending across restarts and across concurrent sessions.
 */

import { mkdir } from "node:fs/promises";
import { checkAsserts, checkCompares } from "./guards.js";
import { withLock } from "./lock.js";
import { appendLog, readLog } from "./log.js";
import { lastTx, materialize } from "./materialize.js";
import { nsPath, storeDir } from "./paths.js";
import { runQuery } from "./query.js";
import { planTransact } from "./transact.js";
import type { FactStore } from "./types.js";

export interface FactStoreOptions {
	/** Log directory; defaults to <FLUSK_HOME>/store. */
	dir?: string;
	/** Clock, so one transact stamps every timestamp from a single reading. */
	now?: () => number;
}

export function createFactStore(options: FactStoreOptions = {}): FactStore {
	const dir = options.dir ?? storeDir();
	const now = options.now ?? Date.now;
	const queues = new Map<string, Promise<unknown>>();
	let nextTx = 0;

	function serialize<T>(ns: string, work: () => Promise<T>): Promise<T> {
		const prior = queues.get(ns) ?? Promise.resolve();
		const run = prior.then(
			() => work(),
			() => work(),
		);
		// The queue must survive a rejected transact, or one failed guard would
		// wedge every later write to that namespace.
		queues.set(
			ns,
			run.then(
				() => undefined,
				() => undefined,
			),
		);
		return run;
	}

	return {
		async query(ns, params) {
			return runQuery(materialize(await readLog(nsPath(dir, ns))), params);
		},

		async transact(ns, asserts, compares = []) {
			checkAsserts(asserts);
			const path = nsPath(dir, ns);
			await mkdir(dir, { recursive: true });
			return serialize(ns, () =>
				withLock(path, async () => {
					const records = await readLog(path);
					const rows = materialize(records);
					const at = now();
					checkCompares(rows, compares, at);
					const tx = Math.max(nextTx, lastTx(records)) + 1;
					nextTx = tx;
					const plan = planTransact(rows, asserts, new Date(at).toISOString(), tx);
					await appendLog(path, plan.records);
					return { tx, ids: plan.ids };
				}),
			);
		},
	};
}
