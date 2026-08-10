/**
 * Frontier computation and multi-session-safe task claiming. Claiming is a
 * compare-and-swap transact: the {Task status pending} guard means exactly
 * one concurrent claimer wins; the losers see the 409 CompareFailed and get
 * null back (the winner's id is in the failure payload server-side).
 */
import type { MemCompare, MemoryClient } from "../memory/client-types.js";
import { task, writeTaskStatus } from "./schema.js";

/**
 * Task ids of `goalId` with status pending whose every depends_on target has
 * status done — pattern queries (has_task / status / depends_on) joined
 * client-side.
 */
export async function frontier(
	client: MemoryClient,
	ns: string,
	goalId: string,
): Promise<string[]> {
	const [edges, statuses, deps] = await Promise.all([
		client.query(ns, { subject: goalId, predicate: "has_task" }),
		client.query(ns, { predicate: "status" }),
		client.query(ns, { predicate: "depends_on" }),
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
 * session already claimed it); rethrows anything that is not a 409.
 */
export async function claimTask(
	client: MemoryClient,
	ns: string,
	taskId: string,
	runId: string,
): Promise<{ tx: number } | null> {
	const guard: MemCompare = { subject: taskId, predicate: "status", object: "pending" };
	try {
		const out = await client.transact(
			ns,
			[task.status(taskId, "running"), task.attemptedBy(taskId, runId)],
			[guard],
		);
		return { tx: out.tx };
	} catch (e) {
		const err = e as { status?: number; code?: string };
		if (err.status === 409 || err.code === "CompareFailed") return null;
		throw e;
	}
}

export async function completeTask(client: MemoryClient, ns: string, t: string): Promise<void> {
	await writeTaskStatus(client, ns, t, "done");
}

export async function failTask(client: MemoryClient, ns: string, t: string): Promise<void> {
	await writeTaskStatus(client, ns, t, "failed");
}
