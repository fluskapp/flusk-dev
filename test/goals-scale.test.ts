/**
 * A goal graph is read out of a namespace shared with every goal that came
 * before it, and that namespace only grows. The property here is that age
 * costs nothing: a finished goal is still finished, and a runnable task is
 * still runnable, in a store that already holds more rows than any read's cap.
 *
 * The failure it pins is silent in the worst way — `flusk goal` prints "goal
 * stalled: no runnable tasks remain" and returns blocked on every rerun of a
 * goal whose every task is done.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { allTasksDone } from "../src/cli/goal-list.js";
import { goalBrief } from "../src/features/goals/resume.js";
import { frontier } from "../src/features/goals/scheduler.js";
import { goal, goalId, task, taskId } from "../src/features/goals/schema.js";
import { DEFAULT_LIMIT } from "../src/features/facts/visibility.js";
import { type Harness, harness, NS, T0 } from "./store-harness.js";

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
});

/** Older goals, each leaving one live status row behind forever. */
async function olderGoals(count: number): Promise<void> {
	for (let i = 0; i < count; i++) {
		h.at(T0 + i * 1000);
		await h.store.transact(NS, [task.status(`Task:old-${i}`, "done")]);
	}
}

it("a goal is still readable in a namespace past the default cap", async () => {
	await olderGoals(DEFAULT_LIMIT + 10);
	const g = goalId();
	const [a, b] = [taskId(), taskId()];
	h.at(T0 + 10_000_000);
	await h.store.transact(NS, [goal.title(g, "ship it"), goal.status(g, "active")]);
	for (const t of [a, b]) {
		await h.store.transact(NS, [goal.hasTask(g, t)]);
		await h.store.transact(NS, [task.description(t, `do ${t}`), task.status(t, "pending")]);
	}
	await h.store.transact(NS, [task.dependsOn(b, a)]);

	// Only the dependency-free task is runnable, and the brief can say why.
	expect(await frontier(h.store, NS, g)).toEqual([a]);
	expect(await goalBrief(h.store, NS, g)).toContain("blocked by");
	expect(await allTasksDone(h.store, NS, g)).toBe(false);

	h.at(T0 + 11_000_000);
	await h.store.transact(NS, [task.status(a, "done")]);
	await h.store.transact(NS, [task.status(b, "done")]);
	expect(await frontier(h.store, NS, g)).toEqual([]);
	expect(await allTasksDone(h.store, NS, g)).toBe(true);
});
