import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ModelRef } from "../src/features/run/run.types.js";
import { planGoal, writeGoalGraph } from "../src/features/goals/planner.js";
import { frontier } from "../src/features/goals/scheduler.js";
import { assistantText, FakeProvider } from "../src/features/provider/fake.js";
import type { FactStore } from "../src/features/facts/types.js";
import { type Harness, harness } from "./store-harness.js";

const model: ModelRef = { provider: "fake", id: "fake-planner", contextWindow: 200_000 };
const planOf = (v: unknown) => new FakeProvider([{ message: assistantText(JSON.stringify(v)) }]);

let h: Harness;
let mem: FactStore;

beforeAll(async () => {
	h = await harness();
	mem = h.store;
});
afterAll(async () => {
	await h.cleanup();
});

describe("planGoal", () => {
	it("parses a valid plan: generated task ids, index deps resolved, one stream call", async () => {
		const json = JSON.stringify({
			title: "Ship",
			tasks: [
				{ description: "build", dependsOn: [] },
				{ description: "test", dependsOn: [0] },
				{ description: "release", dependsOn: [0, 1] },
			],
		});
		const provider = new FakeProvider([{ message: assistantText(`Sure! Plan:\n${json}\nDone.`) }]);
		const plan = await planGoal(provider, model, "ship the widget");
		expect(plan.title).toBe("Ship");
		expect(plan.notes).toEqual([]);
		expect(plan.tasks).toHaveLength(3);
		for (const t of plan.tasks) expect(t.id).toMatch(/^Task:t-[0-9a-f]{8}$/);
		expect(plan.tasks[1]?.dependsOn).toEqual([plan.tasks[0]?.id]);
		expect(plan.tasks[2]?.dependsOn).toEqual([plan.tasks[0]?.id, plan.tasks[1]?.id]);
		expect(provider.requests).toHaveLength(1);
		expect(provider.requests[0]?.system).toContain("JSON");
		expect(provider.requests[0]?.messages).toEqual([{ role: "user", content: "ship the widget" }]);
	});

	it("throws on garbage, carrying the raw text tail", async () => {
		const provider = new FakeProvider([{ message: assistantText("I cannot plan this, sorry.") }]);
		await expect(planGoal(provider, model, "x")).rejects.toThrow(/I cannot plan this, sorry/);
	});

	it("throws on unparseable and shape-invalid JSON", async () => {
		await expect(
			planGoal(new FakeProvider([{ message: assistantText("{not json}") }]), model, "x"),
		).rejects.toThrow(/unparseable JSON/);
		await expect(planGoal(planOf({ title: "x", tasks: [] }), model, "x")).rejects.toThrow(
			/plan shape invalid/,
		);
		await expect(
			planGoal(planOf({ title: "x", tasks: [{ description: "a", dependsOn: ["b"] }] }), model, "x"),
		).rejects.toThrow(/array of task indices/);
	});

	it("throws when the provider ends with a stopReason error", async () => {
		await expect(planGoal(new FakeProvider([]), model, "x")).rejects.toThrow(/script exhausted/);
	});

	it("drops cyclic edges with a note and keeps the graph acyclic", async () => {
		const provider = planOf({
			title: "Cyclic",
			tasks: [
				{ description: "A", dependsOn: [1] },
				{ description: "B", dependsOn: [0] },
			],
		});
		const plan = await planGoal(provider, model, "x");
		expect(plan.notes.some((n) => n.includes("cyclic"))).toBe(true);
		expect(plan.tasks.reduce((n, t) => n + t.dependsOn.length, 0)).toBe(1);
	});

	it("truncates to 10 tasks and drops out-of-range/self dependencies with notes", async () => {
		const tasks = Array.from({ length: 12 }, (_, i) => ({
			description: `t${i}`,
			dependsOn: i === 1 ? [11] : i === 2 ? [2] : [],
		}));
		const plan = await planGoal(planOf({ title: "Big", tasks }), model, "x");
		expect(plan.tasks).toHaveLength(10);
		expect(plan.notes).toContain("plan truncated to 10 tasks");
		expect(plan.notes.filter((n) => n.includes("invalid dependency"))).toHaveLength(2);
		expect(plan.tasks.every((t) => t.dependsOn.length === 0)).toBe(true);
	});

	it("planned graph lands in the store and schedules from the first task", async () => {
		const ns = "repo:planned";
		const provider = planOf({
			title: "Ship",
			tasks: [
				{ description: "build", dependsOn: [] },
				{ description: "release", dependsOn: [0] },
			],
		});
		const plan = await planGoal(provider, model, "ship it");
		const g = await writeGoalGraph(mem, ns, plan);
		expect(await frontier(mem, ns, g)).toEqual([plan.tasks[0]?.id]);
		// Namespace isolation: the graph is invisible from another repo's namespace.
		expect(await frontier(mem, "repo:elsewhere", g)).toEqual([]);
	});
});
