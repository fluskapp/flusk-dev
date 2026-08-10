/**
 * Goal-graph schema: thin compositions over the facts.ts goal/task builders.
 * Ids here are full subjects ("Goal:g-1a2b3c4d", "Task:t-…") so they match
 * query subjects and edge objects verbatim; the wrappers strip the type
 * prefix because facts.ts builders prepend it. Status transitions are plain
 * functional-predicate asserts — supersession IS the history (the previous
 * status survives as a superseded fact with validUntil set).
 */
import { randomBytes } from "node:crypto";
import type { MemFactInput, MemoryClient } from "../memory/client-types.js";
import { type GoalStatus, goalFact, type TaskStatus, taskFact } from "../memory/facts.js";

export type { GoalStatus, TaskStatus };

const hex8 = (): string => randomBytes(4).toString("hex");

/** New goal subject: "Goal:g-" + 8 hex. */
export function goalId(): string {
	return `Goal:g-${hex8()}`;
}

/** New task subject: "Task:t-" + 8 hex. */
export function taskId(): string {
	return `Task:t-${hex8()}`;
}

/** "Goal:g-x" → "g-x" — facts.ts builders re-prepend the type prefix. */
function bare(subject: string): string {
	const i = subject.indexOf(":");
	return i === -1 ? subject : subject.slice(i + 1);
}

export const goal = {
	title: (g: string, title: string): MemFactInput => goalFact.title(bare(g), title),
	status: (g: string, s: GoalStatus): MemFactInput => goalFact.status(bare(g), s),
	hasTask: (g: string, t: string): MemFactInput => goalFact.hasTask(bare(g), bare(t)),
};

export const task = {
	description: (t: string, text: string): MemFactInput => taskFact.description(bare(t), text),
	status: (t: string, s: TaskStatus): MemFactInput => taskFact.status(bare(t), s),
	dependsOn: (t: string, dep: string): MemFactInput => taskFact.dependsOn(bare(t), bare(dep)),
	attemptedBy: (t: string, runId: string): MemFactInput =>
		taskFact.attemptedBy(bare(t), bare(runId)),
};

export async function writeGoalStatus(
	client: MemoryClient,
	ns: string,
	g: string,
	status: GoalStatus,
): Promise<void> {
	await client.transact(ns, [goal.status(g, status)]);
}

export async function writeTaskStatus(
	client: MemoryClient,
	ns: string,
	t: string,
	status: TaskStatus,
): Promise<void> {
	await client.transact(ns, [task.status(t, status)]);
}

/**
 * Return failed tasks of a goal to `pending` so the goal can be retried.
 * Without this a single failure wedges the graph forever: `frontier` only
 * admits pending tasks and completion requires every task done.
 */
export async function resetFailedTasks(
	client: MemoryClient,
	ns: string,
	goalId: string,
): Promise<string[]> {
	const [edges, statuses] = await Promise.all([
		client.query(ns, { subject: goalId, predicate: "has_task", limit: 500 }),
		client.query(ns, { predicate: "status", limit: 500 }),
	]);
	const failed = new Set(
		statuses.filter((f) => f.object === "failed").map((f) => f.subject),
	);
	const mine = edges.map((e) => e.object).filter((t) => failed.has(t));
	for (const taskId of mine) {
		await writeTaskStatus(client, ns, taskId.replace(/^Task:/, ""), "pending");
	}
	return mine;
}
