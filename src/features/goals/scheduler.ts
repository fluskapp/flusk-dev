/**
 * Frontier computation and multi-session-safe task claiming. Claiming is a
 * compare-and-swap transact: the {Task status pending} guard means exactly
 * one concurrent claimer wins; the losers get CompareFailed back and return
 * null, so a lost race never looks like a broken task.
 */
import type { Compare, FactStore } from "../facts/types.js";
import { NO_LIMIT } from "../facts/visibility.js";
import { task, writeTaskStatus } from "./schema.js";

/**
 * Task ids of `goalId` with status pending whose every depends_on target has
 * status done — pattern queries (has_task / status / depends_on) joined
 * client-side.
 */
export async function frontier(store: FactStore, ns: string, goalId: string): Promise<string[]> {
	// Uncapped, not merely generous: the frontier is a join over the WHOLE
	// graph, and a page that omits one status turns a runnable task into an
	// unrunnable one — a goal that stalls with no error and no way to notice.
	const [edges, statuses, deps] = await Promise.all([
		store.query(ns, { subject: goalId, predicate: "has_task", limit: NO_LIMIT }),
		store.query(ns, { predicate: "status", limit: NO_LIMIT }),
		store.query(ns, { predicate: "depends_on", limit: NO_LIMIT }),
	]);
	const statusOf = new Map(statuses.map((f) => [f.subject, f.object]));
	const depsOf = new Map<string, string[]>();
	for (const d of deps) depsOf.set(d.subject, [...(depsOf.get(d.subject) ?? []), d.object]);
	return edges
		.map((e) => e.object)
		.filter(
			(t) =>
				statusOf.get(t) === "pending" &&
				(depsOf.get(t) ?? []).every((dep) => statusOf.get(dep) === "done"),
		);
}

/**
 * CAS-claim `taskId` for `runId`: asserts status running + attempted_by
 * guarded on {status pending}. Returns null when the compare fails (another
 * session already claimed it); rethrows anything else.
 */
export async function claimTask(
	store: FactStore,
	ns: string,
	taskId: string,
	runId: string,
): Promise<{ tx: number } | null> {
	const guard: Compare = { subject: taskId, predicate: "status", object: "pending" };
	try {
		const out = await store.transact(
			ns,
			[task.status(taskId, "running"), task.attemptedBy(taskId, runId)],
			[guard],
		);
		return { tx: out.tx };
	} catch (e) {
		if ((e as { code?: string }).code === "CompareFailed") return null;
		throw e;
	}
}

export async function completeTask(store: FactStore, ns: string, t: string): Promise<void> {
	await writeTaskStatus(store, ns, t, "done");
}

export async function failTask(store: FactStore, ns: string, t: string): Promise<void> {
	await writeTaskStatus(store, ns, t, "failed");
}
