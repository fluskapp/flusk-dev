/**
 * The flow endpoints over a real socket: the library, recent runs, and the dry
 * plan. Offline — the dry route composes prompts out of a seeded corpus and
 * never reaches for a model, which is exactly what the panel shows.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { FlowLibrary } from "../src/ui/api-flow.js";
import type { DryPlan } from "../src/ui/flow-plan.js";
import type { FlowRunRow } from "../src/ui/flow-runs.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call, post } from "./api-http.js";
import { journal, type Tree, tree } from "./project-fixture.js";

let t: Tree;
let ui: UiServer;

const AT = "2026-08-01T10:00:00.000Z";
const RUN = "flow-fix-2026-08-01-10-00-00";

const getJson = async <T>(path: string): Promise<T> =>
	JSON.parse((await call(ui.url, path)).body) as T;

/** A run exactly as src/lang/checkpoint.ts writes one. */
function checkpoint(runId: string, task: string, steps: [string, string, boolean, string][]): void {
	const dir = join(t.home, "flows", "checkpoints", runId);
	mkdirSync(dir, { recursive: true });
	const lines = [{ type: "run", runId, spec: "fix", task, at: AT }];
	for (const [nodeId, kind, ok, output] of steps) {
		lines.push({
			type: "step",
			nodeId,
			kind,
			at: AT,
			ok,
			output,
			promptTokens: 120,
			costUsd: 0.25,
		} as unknown as (typeof lines)[0]);
	}
	writeFileSync(join(dir, "steps.jsonl"), `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`);
}

beforeAll(async () => {
	t = tree();
	writeFileSync(join(t.home, "config.json"), JSON.stringify({ ui: t.cfg.ui }));
	// The journal a flow run writes is what gives the run its project.
	journal(join(t.work, "proj-a"), "2026-08-01-10-00-00-retry", {
		title: '"Flow: add a retry"',
		date: AT,
		status: "done",
		kind: '"flow"',
		tool: '"fix"',
	});
	checkpoint(RUN, "add a retry with backoff", [
		["plan", "plan", true, "the plan"],
		["code", "code", true, "the change"],
		["verify", "verify", false, "the report"],
	]);
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	t.cleanup();
});

it("serves the flow library with each flow's shape, nesting included", async () => {
	const lib = await getJson<FlowLibrary>("/api/flows");
	expect(lib.library.map((f) => f.name)).toEqual(["fix", "review", "explore", "ship"]);
	expect(lib.library.find((f) => f.name === "fix")?.shape).toBe("plan -> code -> verify");
	expect(lib.library.find((f) => f.name === "ship")?.shape).toBe(
		"fix[plan -> code -> verify] -> review -> verify",
	);
	expect(lib.user).toEqual([]);
	expect(lib.errors).toEqual([]);
});

it("lists recent flow runs with their pipeline, and joins them to a project", async () => {
	const runs = await getJson<FlowRunRow[]>("/api/flow-runs");
	expect(runs).toHaveLength(1);
	const run = runs[0];
	expect(run).toMatchObject({ runId: RUN, flow: "fix", status: "failed", project: "proj-a" });
	expect(run?.steps.map((s) => s.nodeId)).toEqual(["plan", "code", "verify"]);
	expect(run?.costUsd).toBeCloseTo(0.75);
	const scoped = await getJson<FlowRunRow[]>("/api/flow-runs?project=proj-a");
	expect(scoped).toHaveLength(1);
	expect(await getJson<FlowRunRow[]>("/api/flow-runs?project=nobody")).toEqual([]);
});

it("serves one run with every step's output and the sources its prompt used", async () => {
	const run = await getJson<FlowRunRow>(`/api/flow-runs?run=${RUN}`);
	expect(run.steps.map((s) => s.output)).toEqual(["the plan", "the change", "the report"]);
	// The code step's prompt inherited the plan step's artifact — nobody wired it.
	expect(run.steps[1]?.sources).toContain("node plan (plan)");
	expect(run.steps.every((s) => s.sources?.[0] === "job")).toBe(true);
	expect((await call(ui.url, "/api/flow-runs?run=nope")).status).toBe(404);
});

it("plans a dry run: a graph, and a composed prompt per node", async () => {
	const reply = await post(ui.url, "/api/flow/dry", { task: "fix the flaky uploader test" });
	expect(reply.status).toBe(200);
	const plan = JSON.parse(reply.body) as DryPlan;
	expect(plan.shape).toBe("plan -> code -> verify");
	expect(plan.nodes.map((n) => n.id)).toEqual(["plan", "code", "verify"]);
	expect(plan.nodes[0]?.job).toMatch(/^Plan the approach for /);
	expect(plan.nodes[0]?.text).toContain(plan.nodes[0]?.job ?? "");
	expect(plan.nodes.every((n) => n.tokens > 0)).toBe(true);
});

it("takes a named flow and refuses a body that is not a task", async () => {
	const named = await post(ui.url, "/api/flow/dry", { task: "ship it", flow: "ship" });
	expect((JSON.parse(named.body) as DryPlan).flow).toBe("ship");
	expect((await post(ui.url, "/api/flow/dry", { task: "" })).status).toBe(400);
	expect((await post(ui.url, "/api/flow/dry", { task: "x".repeat(2000) })).status).toBe(400);
	expect((await post(ui.url, "/api/flow/dry", [1, 2])).status).toBe(400);
});
