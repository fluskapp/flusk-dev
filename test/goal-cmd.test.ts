import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { goalCmd } from "../src/cli/goal-cmd.js";
import { assistantText } from "../src/provider/fake.js";
import { repoSlug } from "../src/session/paths.js";
import { createFactStore } from "../src/store/store.js";
import type { Fact } from "../src/store/types.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;
let ns: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-goal-");
	ns = `repo:${repoSlug(repo)}`;
}, SLOW);
afterEach(() => {
	teardownTestHome();
}, SLOW);

/**
 * The graph goalCmd actually wrote. It opens the store under the test's own
 * AH_HOME, which is where the command's own default store lives.
 */
async function graph(): Promise<Fact[]> {
	return createFactStore().query(ns, { limit: 500 });
}

/** Planner reply: two tasks, B depends on A. */
const plan = {
	title: "Ship it",
	tasks: [
		{ description: "task A", dependsOn: [] },
		{ description: "task B", dependsOn: [0] },
	],
};

async function writeScript(turns: unknown[]): Promise<string> {
	const path = join(repo, "..", `goal-${Math.random().toString(16).slice(2)}.json`);
	await writeFile(path, JSON.stringify(turns));
	return path;
}

/** Planner turn + one trivially-completing turn per task (no verify cmds). */
const fullScript = () => [
	{ message: assistantText(JSON.stringify(plan)) },
	{ message: assistantText("did task A") },
	{ message: assistantText("did task B") },
];

test("plans, writes the graph, executes tasks in dependency order, ends done", async () => {
	const script = await writeScript(fullScript());
	const cap = capture();
	const outcome = await goalCmd({ goal: "ship the feature", repo, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("completed");
	expect(cap.text()).toContain("plan: Ship it");
	expect(cap.text()).toContain("goal done");

	const active = await graph();
	const status = (subjPrefix: string) =>
		active
			.filter((f) => f.subject.startsWith(subjPrefix) && f.predicate === "status")
			.map((f) => f.object);
	expect(status("Goal:")).toEqual(["done"]);
	expect(status("Task:")).toEqual(["done", "done"]);
	expect(active.filter((f) => f.predicate === "depends_on")).toHaveLength(1);
	// each task session was claimed (attempted_by) and digested a completed run
	expect(active.filter((f) => f.predicate === "attempted_by")).toHaveLength(2);
	const runOutcomes = active.filter(
		(f) => f.subject.startsWith("Run:") && f.predicate === "outcome",
	);
	expect(runOutcomes.map((f) => f.object)).toEqual(["completed", "completed"]);
	// task A ran before task B (dependency order in the CLI transcript)
	expect(cap.text().indexOf("task Task:t-")).toBeLessThan(cap.text().lastIndexOf("task Task:t-"));
}, SLOW);

test("--list renders goals with per-task status lines", async () => {
	const script = await writeScript(fullScript());
	await goalCmd({ goal: "ship it", repo, fake: script, quiet: true, out: capture().out });
	const cap = capture();
	const outcome = await goalCmd({ list: true, repo, out: cap.out });
	expect(outcome).toBe("completed");
	expect(cap.text()).toMatch(/Goal:g-[0-9a-f]{8} Ship it — done/);
	expect(cap.text()).toMatch(/ {2}Task:t-[0-9a-f]{8} task A — done/);
	expect(cap.text()).toMatch(/ {2}Task:t-[0-9a-f]{8} task B — done/);
}, SLOW);

test("--dry plans and prints the graph but writes nothing", async () => {
	const script = await writeScript([{ message: assistantText(JSON.stringify(plan)) }]);
	const cap = capture();
	const outcome = await goalCmd({ goal: "ship it", repo, dry: true, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("completed");
	expect(cap.text()).toContain("plan: Ship it");
	expect(cap.text()).toContain("task B");
	expect(await graph()).toEqual([]);
}, SLOW);

test("a failing task marks it failed and stops the goal", async () => {
	const script = await writeScript([
		{ message: assistantText(JSON.stringify(plan)) },
		{ message: { role: "assistant", content: [], stopReason: "error", errorMessage: "boom" } },
	]);
	const cap = capture();
	const outcome = await goalCmd({ goal: "ship it", repo, fake: script, quiet: true, out: cap.out });
	expect(outcome).toBe("error");
	const active = (await graph()).filter((f) => f.predicate === "status");
	const tasks = active.filter((f) => f.subject.startsWith("Task:")).map((f) => f.object);
	expect(tasks.sort()).toEqual(["failed", "pending"]); // B never ran
	expect(cap.text()).toContain("failed");
}, SLOW);
