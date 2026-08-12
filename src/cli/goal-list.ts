/**
 * Goal-graph read helpers for the goal command: the --list rendering and the
 * small per-task queries the execution loop needs. Reads are namespace-scoped
 * store queries and nothing else — no goal is ever read across namespaces.
 */
import type { Fact, FactStore } from "../store/types.js";
import { NO_LIMIT } from "../store/visibility.js";

interface GraphView {
	statusOf: Map<string, string>;
	descOf: Map<string, string>;
	tasksOf: Map<string, string[]>;
	titles: Fact[];
}

async function loadGraph(store: FactStore, ns: string): Promise<GraphView> {
	// Uncapped: a truncated page renders a real task as "unknown", which reads
	// as a graph the harness has lost track of rather than as a short answer.
	const [titles, statuses, edges, descs] = await Promise.all([
		store.query(ns, { predicate: "title", limit: NO_LIMIT }),
		store.query(ns, { predicate: "status", limit: NO_LIMIT }),
		store.query(ns, { predicate: "has_task", limit: NO_LIMIT }),
		store.query(ns, { predicate: "description", limit: NO_LIMIT }),
	]);
	const tasksOf = new Map<string, string[]>();
	for (const e of edges) tasksOf.set(e.subject, [...(tasksOf.get(e.subject) ?? []), e.object]);
	return {
		titles,
		tasksOf,
		statusOf: new Map(statuses.map((f) => [f.subject, f.object])),
		descOf: new Map(descs.map((f) => [f.subject, f.object])),
	};
}

/** `flusk goal --list`: goals with title/status plus per-task status lines. */
export async function renderGoalList(store: FactStore, ns: string): Promise<string> {
	const g = await loadGraph(store, ns);
	if (g.titles.length === 0) return "no goals\n";
	const lines = g.titles.flatMap((t) => [
		`${t.subject} ${t.object} — ${g.statusOf.get(t.subject) ?? "unknown"}`,
		...(g.tasksOf.get(t.subject) ?? []).map(
			(task) =>
				`  ${task} ${g.descOf.get(task) ?? ""} — ${g.statusOf.get(task) ?? "unknown"}`,
		),
	]);
	return `${lines.join("\n")}\n`;
}

/** True when every task of `goalId` has status done. */
export async function allTasksDone(
	store: FactStore,
	ns: string,
	goalId: string,
): Promise<boolean> {
	// Uncapped: one status missing from the page is indistinguishable from a
	// task that is not done, and the goal would never be recorded finished.
	const [edges, statuses] = await Promise.all([
		store.query(ns, { subject: goalId, predicate: "has_task", limit: NO_LIMIT }),
		store.query(ns, { predicate: "status", limit: NO_LIMIT }),
	]);
	const statusOf = new Map(statuses.map((f) => [f.subject, f.object]));
	return edges.every((e) => statusOf.get(e.object) === "done");
}

/** Task description text, falling back to the task id. */
export async function taskDescription(
	store: FactStore,
	ns: string,
	taskId: string,
): Promise<string> {
	const rows = await store.query(ns, { subject: taskId, predicate: "description" });
	return rows[0]?.object ?? taskId;
}
