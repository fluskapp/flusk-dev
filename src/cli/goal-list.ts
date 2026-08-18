/**
 * Goal-graph read helpers for the goal command: the --list rendering and the
 * small per-task queries the execution loop needs. The graph itself is loaded
 * by the goals feature (read.repository.ts) — the CLI renders that one shape,
 * so the UI and this command cannot drift apart. Reads are namespace-scoped
 * store queries and nothing else — no goal is ever read across namespaces.
 */
import { loadGoalGraph } from "../features/goals/read.repository.js";
import type { FactStore } from "../features/facts/types.js";
import { NO_LIMIT } from "../features/facts/visibility.js";

/** `flusk goal --list`: goals with title/status plus per-task status lines. */
export async function renderGoalList(store: FactStore, ns: string): Promise<string> {
	const goals = await loadGoalGraph(store, ns);
	if (goals.length === 0) return "no goals\n";
	const lines = goals.flatMap((g) => [
		`${g.id} ${g.title} — ${g.status}`,
		...g.tasks.map((t) => `  ${t.id} ${t.description} — ${t.status}`),
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
