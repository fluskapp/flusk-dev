/**
 * The extracted goal-graph read path (H0 D9): loadGoalGraph shapes the
 * vocabulary facts — including the depends_on/attempted_by edges the CLI
 * never printed — and `flusk goal --list` output stays BYTE-identical after
 * the extraction, unknown/empty defaults included.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { renderGoalList } from "../src/cli/goal-list.js";
import { loadGoalGraph } from "../src/features/goals/read.repository.js";
import { goal, task } from "../src/features/goals/schema.js";
import { type Harness, harness, NS } from "./store-harness.js";

const g = "Goal:g-11111111";
const t1 = "Task:t-aaaaaaaa";
const t2 = "Task:t-bbbbbbbb";

let h: Harness;

beforeAll(async () => {
	h = await harness();
	// One (subject, predicate) per batch: the second has_task edge coexists,
	// so it lands in its own transact exactly as the planner writes it.
	await h.store.transact(NS, [goal.title(g, "Ship it"), goal.status(g, "active")]);
	await h.store.transact(NS, [goal.hasTask(g, t1)]);
	await h.store.transact(NS, [goal.hasTask(g, t2)]);
	await h.store.transact(NS, [task.description(t1, "task A"), task.status(t1, "done")]);
	await h.store.transact(NS, [
		task.description(t2, "task B"),
		task.status(t2, "pending"),
		task.dependsOn(t2, t1),
		task.attemptedBy(t2, "r-12345678"),
	]);
});

afterAll(async () => {
	await h.cleanup();
});

it("shapes goals with tasks, dependencies and attempts", async () => {
	const graph = await loadGoalGraph(h.store, NS);
	expect(graph).toEqual([
		{
			id: g,
			title: "Ship it",
			status: "active",
			tasks: [
				{ id: t1, description: "task A", status: "done", dependsOn: [], attemptedBy: [] },
				{
					id: t2,
					description: "task B",
					status: "pending",
					dependsOn: [t1],
					attemptedBy: ["Run:r-12345678"],
				},
			],
		},
	]);
});

it("keeps the goal --list rendering byte-identical", async () => {
	expect(await renderGoalList(h.store, NS)).toBe(
		`${g} Ship it — active\n  ${t1} task A — done\n  ${t2} task B — pending\n`,
	);
});

it("defaults a missing status to unknown, exactly as the CLI printed it", async () => {
	const bare = "Goal:g-22222222";
	await h.store.transact(NS, [goal.title(bare, "No status yet")]);
	const graph = await loadGoalGraph(h.store, NS);
	expect(graph.find((x) => x.id === bare)?.status).toBe("unknown");
	expect(await renderGoalList(h.store, NS)).toContain(`${bare} No status yet — unknown\n`);
});

it("answers an empty namespace with an empty graph and 'no goals'", async () => {
	expect(await loadGoalGraph(h.store, "repo:empty-00000000")).toEqual([]);
	expect(await renderGoalList(h.store, "repo:empty-00000000")).toBe("no goals\n");
});
