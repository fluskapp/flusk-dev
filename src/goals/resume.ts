/**
 * Resume brief: render a goal graph (tasks, statuses, deps) plus an optional
 * whats-changed summary.
 */
import { whatsChanged } from "../store/changes.js";
import type { FactStore } from "../store/types.js";
import { NO_LIMIT } from "../store/visibility.js";

/**
 * Counts scoped to this goal's subjects. Delegates the diff to changes.ts
 * rather than re-querying: closing a fact stamps its validUntil, so a default
 * read cannot see the superseded half of the diff at all.
 */
async function changedCounts(
	store: FactStore,
	ns: string,
	sinceIso: string,
	subjects: Set<string>,
): Promise<{ added: number; superseded: number }> {
	const changes = await whatsChanged(store, ns, sinceIso);
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
	store: FactStore,
	ns: string,
	goalId: string,
	sinceIso?: string,
): Promise<string> {
	// Uncapped, like every other read of the graph: a brief assembled from a
	// page reports tasks as "unknown" and dependencies as unmet.
	const [titles, edges, statuses, deps, descs] = await Promise.all([
		store.query(ns, { subject: goalId, predicate: "title", limit: NO_LIMIT }),
		store.query(ns, { subject: goalId, predicate: "has_task", limit: NO_LIMIT }),
		store.query(ns, { predicate: "status", limit: NO_LIMIT }),
		store.query(ns, { predicate: "depends_on", limit: NO_LIMIT }),
		store.query(ns, { predicate: "description", limit: NO_LIMIT }),
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
		const { added, superseded } = await changedCounts(store, ns, sinceIso, scope);
		brief += ` Since ${sinceIso}: ${added} added, ${superseded} superseded.`;
	}
	return brief;
}
