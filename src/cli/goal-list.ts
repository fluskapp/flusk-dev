/**
 * Goal-graph read helpers for the goal command: the --list rendering and the
 * small per-task queries the execution loop needs. Reads go through the
 * namespace-disciplined MemoryClient only.
 */
import type { MemFact, MemoryClient } from "../memory/client-types.js";

interface GraphView {
	statusOf: Map<string, string>;
	descOf: Map<string, string>;
	tasksOf: Map<string, string[]>;
	titles: MemFact[];
}

async function loadGraph(client: MemoryClient, ns: string): Promise<GraphView> {
	const [titles, statuses, edges, descs] = await Promise.all([
		client.query(ns, { predicate: "title" }),
		client.query(ns, { predicate: "status" }),
		client.query(ns, { predicate: "has_task" }),
		client.query(ns, { predicate: "description" }),
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

/** `ah goal --list`: goals with title/status plus per-task status lines. */
export async function renderGoalList(client: MemoryClient, ns: string): Promise<string> {
	const g = await loadGraph(client, ns);
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
	client: MemoryClient,
	ns: string,
	goalId: string,
): Promise<boolean> {
	const [edges, statuses] = await Promise.all([
		client.query(ns, { subject: goalId, predicate: "has_task" }),
		client.query(ns, { predicate: "status" }),
	]);
	const statusOf = new Map(statuses.map((f) => [f.subject, f.object]));
	return edges.every((e) => statusOf.get(e.object) === "done");
}

/** Task description text, falling back to the task id. */
export async function taskDescription(
	client: MemoryClient,
	ns: string,
	taskId: string,
): Promise<string> {
	const rows = await client.query(ns, { subject: taskId, predicate: "description" });
	return rows[0]?.object ?? taskId;
}
