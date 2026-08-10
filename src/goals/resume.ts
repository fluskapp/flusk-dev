/**
 * Resume brief: render a goal graph (tasks, statuses, deps) plus an optional
 * whats-changed summary.
 */
import type { MemoryClient } from "../memory/client-types.js";
import { whatsChanged } from "../memory/changes.js";

/**
 * Counts scoped to this goal's subjects. Delegates the diff to changes.ts
 * rather than re-querying: a hand-rolled version here queried superseded
 * facts directly, which a real abagraph hides from default reads.
 */
async function changedCounts(
	client: MemoryClient,
	ns: string,
	sinceIso: string,
	subjects: Set<string>,
): Promise<{ added: number; superseded: number }> {
	const changes = await whatsChanged(client, ns, sinceIso);
	return {
		added: changes.added.filter((f) => subjects.has(f.subject)).length,
		superseded: changes.superseded.filter((f) => subjects.has(f.subject)).length,
	};
}

/**
 * One-paragraph brief, e.g.
 * "Goal Ship: task A done, task B pending (deps met), task C blocked by B.
 *  Since <t>: 3 added, 1 superseded."
 */
export async function goalBrief(
	client: MemoryClient,
	ns: string,
	goalId: string,
	sinceIso?: string,
): Promise<string> {
	const [titles, edges, statuses, deps, descs] = await Promise.all([
		client.query(ns, { subject: goalId, predicate: "title" }),
		client.query(ns, { subject: goalId, predicate: "has_task" }),
		client.query(ns, { predicate: "status" }),
		client.query(ns, { predicate: "depends_on" }),
		client.query(ns, { predicate: "description" }),
	]);
	const statusOf = new Map(statuses.map((f) => [f.subject, f.object]));
	const nameOf = new Map(descs.map((f) => [f.subject, f.object]));
	const depsOf = new Map<string, string[]>();
	for (const d of deps) depsOf.set(d.subject, [...(depsOf.get(d.subject) ?? []), d.object]);
	const tasks = edges.map((e) => e.object);
	const name = (t: string): string => nameOf.get(t) ?? t;
	const parts = tasks.map((t) => {
		const status = statusOf.get(t) ?? "unknown";
		const unmet = (depsOf.get(t) ?? []).filter((dep) => statusOf.get(dep) !== "done");
		if (status === "pending" && unmet.length > 0)
			return `task ${name(t)} blocked by ${unmet.map(name).join(" and ")}`;
		if (status === "pending") return `task ${name(t)} pending (deps met)`;
		return `task ${name(t)} ${status}`;
	});
	let brief = `Goal ${titles[0]?.object ?? goalId}: ${parts.join(", ")}.`;
	if (sinceIso !== undefined) {
		const scope = new Set([goalId, ...tasks]);
		const { added, superseded } = await changedCounts(client, ns, sinceIso, scope);
		brief += ` Since ${sinceIso}: ${added} added, ${superseded} superseded.`;
	}
	return brief;
}
