import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GoalPlan } from "../src/goals/planner.js";
import { writeGoalGraph } from "../src/goals/planner.js";
import { goalBrief } from "../src/goals/resume.js";
import { claimTask, completeTask, failTask, frontier } from "../src/goals/scheduler.js";
import { goalId, taskId, writeTaskStatus } from "../src/goals/schema.js";
import type { FactStore } from "../src/store/types.js";
import { type Harness, HOUR, harness, T0 } from "./store-harness.js";

let h: Harness;
let mem: FactStore;

beforeAll(async () => {
	h = await harness();
	mem = h.store;
});
afterAll(async () => {
	await h.cleanup();
});

/** A; B,C depend on A; D depends on B and C. */
function diamond(): GoalPlan {
	const [a, b, c, d] = [taskId(), taskId(), taskId(), taskId()] as [string, string, string, string];
	return {
		title: "Ship the widget",
		notes: [],
		tasks: [
			{ id: a, description: "A", dependsOn: [] },
			{ id: b, description: "B", dependsOn: [a] },
			{ id: c, description: "C", dependsOn: [a] },
			{ id: d, description: "D", dependsOn: [b, c] },
		],
	};
}

describe("goal graphs in the fact store", () => {
	it("writeGoalGraph survives the distinct-assert guard and reads back whole", async () => {
		const ns = "repo:graph";
		const plan = diamond();
		const g = await writeGoalGraph(mem, ns, plan);
		expect(g).toMatch(/^Goal:g-[0-9a-f]{8}$/);
		expect(goalId()).toMatch(/^Goal:g-[0-9a-f]{8}$/);
		const obj = async (p: Record<string, string>) => (await mem.query(ns, p)).map((f) => f.object);
		expect(await obj({ subject: g, predicate: "title" })).toEqual(["Ship the widget"]);
		expect(await obj({ subject: g, predicate: "status" })).toEqual(["planned"]);
		const taskIds = plan.tasks.map((t) => t.id);
		expect((await obj({ subject: g, predicate: "has_task" })).sort()).toEqual([...taskIds].sort());
		expect((await obj({ predicate: "description" })).sort()).toEqual(["A", "B", "C", "D"]);
		const deps = await mem.query(ns, { predicate: "depends_on" });
		expect(deps.map((f) => `${f.subject}>${f.object}`).sort()).toEqual(
			plan.tasks.flatMap((t) => t.dependsOn.map((d) => `${t.id}>${d}`)).sort(),
		);
		for (const t of taskIds)
			expect(await obj({ subject: t, predicate: "status" })).toEqual(["pending"]);
		// Namespace isolation: none of it is visible from a neighbouring repo.
		expect(await mem.query("repo:elsewhere", { limit: 500 })).toEqual([]);
	});

	it("frontier walks the diamond as dependencies complete", async () => {
		const ns = "repo:frontier";
		const plan = diamond();
		const g = await writeGoalGraph(mem, ns, plan);
		const [a, b, c, d] = plan.tasks.map((t) => t.id);
		expect(await frontier(mem, ns, g)).toEqual([a]);
		await completeTask(mem, ns, a as string);
		expect((await frontier(mem, ns, g)).sort()).toEqual([b, c].sort());
		await completeTask(mem, ns, b as string);
		expect(await frontier(mem, ns, g)).toEqual([c]);
		await completeTask(mem, ns, c as string);
		expect(await frontier(mem, ns, g)).toEqual([d]);
		await failTask(mem, ns, d as string);
		expect(await frontier(mem, ns, g)).toEqual([]);
	});

	it("claimTask CAS: exactly one of two concurrent claimers wins", async () => {
		const ns = "repo:claim";
		const t = taskId();
		await writeTaskStatus(mem, ns, t, "pending");
		const [r1, r2] = await Promise.all([
			claimTask(mem, ns, t, "run-1"),
			claimTask(mem, ns, t, "run-2"),
		]);
		expect([r1, r2].filter((r) => r !== null)).toHaveLength(1);
		const winner = r1 !== null ? "run-1" : "run-2";
		const status = await mem.query(ns, { subject: t, predicate: "status" });
		expect(status.map((f) => f.object)).toEqual(["running"]);
		const attempts = await mem.query(ns, { subject: t, predicate: "attempted_by" });
		expect(attempts.map((f) => f.object)).toEqual([`Run:${winner}`]);
		expect(await claimTask(mem, ns, t, "run-3")).toBeNull();
	});

	it("status transitions leave the history as superseded facts", async () => {
		const ns = "repo:history";
		const t = taskId();
		// Each transition needs its own instant, or the closed row would carry
		// the same validFrom as its replacement and no snapshot could separate them.
		await writeTaskStatus(mem, ns, t, "pending");
		h.at(T0 + HOUR);
		await writeTaskStatus(mem, ns, t, "running");
		h.at(T0 + 2 * HOUR);
		await writeTaskStatus(mem, ns, t, "done");
		h.at(T0);
		const active = await mem.query(ns, { subject: t, predicate: "status" });
		expect(active.map((f) => f.object)).toEqual(["done"]);
		// History is reached with asOf, NOT by asking for status "superseded":
		// closing a fact stamps validUntil, and a default read returns only facts
		// with none.
		const closed = await mem.query(ns, {
			subject: t,
			predicate: "status",
			status: "superseded",
			asOf: Date.parse(active[0]?.validFrom ?? "") - 1,
		});
		expect(closed.every((f) => typeof f.validUntil === "string")).toBe(true);
	});

	it("goalBrief renders the diamond and the since-diff", async () => {
		const ns = "repo:brief";
		const plan = diamond();
		const g = await writeGoalGraph(mem, ns, plan);
		await completeTask(mem, ns, plan.tasks[0]?.id as string);
		const brief = await goalBrief(mem, ns, g);
		expect(brief).toContain("Goal Ship the widget:");
		expect(brief).toContain("task A done");
		expect(brief).toContain("task B pending (deps met)");
		expect(brief).toContain("task C pending (deps met)");
		expect(brief).toContain("task D blocked by B and C");
		const all = await mem.query(ns, {});
		const since = new Date(
			Math.max(...all.map((f) => Date.parse(f.validFrom ?? "0"))),
		).toISOString();
		// The diff is between two snapshots, so the second completion needs an
		// instant of its own: written at `since` it would be in both of them.
		h.at(T0 + HOUR);
		await completeTask(mem, ns, plan.tasks[1]?.id as string);
		const diff = await goalBrief(mem, ns, g, since);
		expect(diff).toContain("task B done");
		expect(diff).toContain(`Since ${since}: 1 added, 1 superseded.`);
	});
});
