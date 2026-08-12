/**
 * Goal-graph schema: the subjects, predicates and cardinalities a goal graph
 * is made of, plus the writes that move one forward. Ids are full subjects
 * ("Goal:g-1a2b3c4d", "Task:t-…") so they match query subjects and edge
 * objects verbatim; the builders normalise whichever form a caller hands in.
 *
 * Cardinality is NOT declared here. `has_task`, `depends_on` and
 * `attempted_by` are multi-valued and must coexist — otherwise each new edge
 * closes the previous one and a graph collapses to its last task — while
 * `title`, `description` and `status` are functional, so a new assert
 * supersedes the old value and that supersession IS the history. Which is
 * which is decided by the one table in src/store/facts.ts, so that a second
 * copy of the answer here cannot drift out of agreement with it.
 */
import { randomBytes } from "node:crypto";
import { fact } from "../facts/facts.js";
import type { FactInput, FactStore } from "../facts/types.js";
import { NO_LIMIT } from "../facts/visibility.js";

export type GoalStatus = "planned" | "active" | "done" | "abandoned";
export type TaskStatus = "pending" | "running" | "done" | "failed" | "blocked";

const hex8 = (): string => randomBytes(4).toString("hex");

/** New goal subject: "Goal:g-" + 8 hex. */
export function goalId(): string {
	return `Goal:g-${hex8()}`;
}

/** New task subject: "Task:t-" + 8 hex. */
export function taskId(): string {
	return `Task:t-${hex8()}`;
}

/** "Goal:g-x" and "g-x" both qualify to "Goal:g-x". */
function qualify(type: string, id: string): string {
	const i = id.indexOf(":");
	return `${type}:${i === -1 ? id : id.slice(i + 1)}`;
}

export const goal = {
	title: (g: string, title: string): FactInput => fact(qualify("Goal", g), "title", title),
	status: (g: string, s: GoalStatus): FactInput => fact(qualify("Goal", g), "status", s),
	hasTask: (g: string, t: string): FactInput =>
		fact(qualify("Goal", g), "has_task", qualify("Task", t)),
};

export const task = {
	description: (t: string, text: string): FactInput =>
		fact(qualify("Task", t), "description", text),
	status: (t: string, s: TaskStatus): FactInput => fact(qualify("Task", t), "status", s),
	dependsOn: (t: string, dep: string): FactInput =>
		fact(qualify("Task", t), "depends_on", qualify("Task", dep)),
	attemptedBy: (t: string, runId: string): FactInput =>
		fact(qualify("Task", t), "attempted_by", qualify("Run", runId)),
};

export async function writeGoalStatus(
	store: FactStore,
	ns: string,
	g: string,
	status: GoalStatus,
): Promise<void> {
	await store.transact(ns, [goal.status(g, status)]);
}

export async function writeTaskStatus(
	store: FactStore,
	ns: string,
	t: string,
	status: TaskStatus,
): Promise<void> {
	await store.transact(ns, [task.status(t, status)]);
}

/**
 * Return failed tasks of a goal to `pending` so the goal can be retried.
 * Without this a single failure wedges the graph forever: `frontier` only
 * admits pending tasks and completion requires every task done.
 */
export async function resetFailedTasks(
	store: FactStore,
	ns: string,
	goalId: string,
): Promise<string[]> {
	const [edges, statuses] = await Promise.all([
		store.query(ns, { subject: goalId, predicate: "has_task", limit: NO_LIMIT }),
		store.query(ns, { predicate: "status", limit: NO_LIMIT }),
	]);
	const failed = new Set(statuses.filter((f) => f.object === "failed").map((f) => f.subject));
	const mine = edges.map((e) => e.object).filter((t) => failed.has(t));
	for (const taskId of mine) {
		await writeTaskStatus(store, ns, taskId, "pending");
	}
	return mine;
}
