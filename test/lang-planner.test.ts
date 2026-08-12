/**
 * The shape of a run, as data. No LangGraph here — a plan is a FlowSpec long
 * before anything compiles it — so this suite runs even where the optional
 * packages are absent, and nothing in it writes a prompt.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { isPhrase } from "../src/features/flows/context.js";
import { BUILT_IN, FIX, SHIP } from "../src/features/flows/library.js";
import { growFrom, planFlow } from "../src/features/flows/planner.js";
import { followUps } from "../src/features/flows/planner-parse.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let _repo: string;

beforeEach(async () => {
	_repo = await setupTestHome("flusk-lang-planner-");
});

afterEach(() => {
	teardownTestHome();
});

const _write = async (dir: string, name: string, spec: unknown): Promise<void> => {
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, name), JSON.stringify(spec), "utf8");
};

it("picks a library flow from the task's intent, reusing flusk's classifier", () => {
	expect(planFlow("add a retry to the uploader").base).toBe("fix");
	expect(planFlow("review this PR before it lands").base).toBe("review");
	expect(planFlow("explain how the queue works").base).toBe("explore");
	expect(planFlow("anything", { flow: "ship" }).base).toBe("ship");
	// An unknown name is not a failure: intent still answers.
	expect(planFlow("add a retry", { flow: "nope" }).base).toBe("fix");
});

it("ships flows that compose — ship runs fix as one node — and no prompts", () => {
	expect(BUILT_IN.map((f) => f.name)).toEqual(["fix", "review", "explore", "ship"]);
	expect(SHIP.nodes.find((n) => n.kind === "flow")?.flow).toBe("fix");
	expect(FIX.nodes.map((n) => n.kind)).toEqual(["plan", "code", "verify"]);
	for (const flow of BUILT_IN) {
		for (const node of flow.nodes) expect(isPhrase(node.about ?? "")).toBe(true);
	}
});

it("reads the follow-up steps a plan declared, as JSON or as lines", () => {
	const json = '```json\n{"steps":[{"kind":"review","about":"check the edges"}]}\n```';
	expect(followUps(json)).toEqual([{ id: "review", kind: "review", about: "check the edges" }]);
	const lines = followUps("The shape:\n- code: make the tests pass\n2. verify — prove it\n");
	expect(lines.map((n) => n.kind)).toEqual(["code", "verify"]);
	expect(lines[0]?.about).toBe("make the tests pass");
	// A declared step is a job, never a prompt: long text is clamped to a phrase.
	const long = followUps(`- code: ${"do the thing ".repeat(20)}\n- verify: prove it`);
	expect(long).toHaveLength(2);
	expect(isPhrase(long[0]?.about ?? "")).toBe(true);
});

it("does not grow the graph out of ordinary plan prose", () => {
	// Observed live: each of these injected a node the plan never declared.
	expect(followUps("Plan: add a retry helper")).toEqual([]);
	expect(followUps("Review: the uploader throws on a 500.\nSummarize: not needed.")).toEqual([]);
	// A list marker is required, and one lone item is a sentence, not a list.
	expect(followUps("- code: make the tests pass")).toEqual([]);
	expect(followUps("First, code: write it.\nThen verify: run it.")).toEqual([]);
});

it("degrades to the library flow when the plan is prose or malformed", () => {
	expect(followUps("I will refactor the worker and then run the tests.")).toEqual([]);
	expect(followUps("```json\n{oh no\n```")).toEqual([]);
	const grown = growFrom(planFlow("add a retry"), "plan", "nothing declared here");
	expect(grown.spec).toBe(FIX); // untouched, not a half-built graph
	expect(grown.entry).toBe("code");
	expect(grown.note).toBe("");
});

it("splices added steps between the plan and what it already pointed at", () => {
	const declared = "- review: check the edges\n- summarize: say what happened";
	const grown = growFrom(planFlow("add a retry"), "plan", declared);
	const next = Object.fromEntries(grown.spec.nodes.map((n) => [n.id, n.next]));
	expect(grown.entry).toBe("review");
	expect(next.plan).toEqual(["review"]);
	expect(next.review).toEqual(["summarize"]);
	expect(next.summarize).toEqual(["code"]);
	expect(next.code).toEqual(["verify"]);
	expect(grown.note).toBe("the plan added 2 step(s)");
	expect(FIX.nodes[0]?.next).toEqual(["code"]); // the library is not edited
});

it("keeps added ids unique and says so when the cap trims the plan", () => {
	const many = Array.from({ length: 12 }, () => "- code: keep going").join("\n");
	const grown = growFrom(planFlow("add a retry"), "plan", many, 6);
	expect(grown.spec.nodes).toHaveLength(6);
	expect(new Set(grown.spec.nodes.map((n) => n.id)).size).toBe(6);
	expect(grown.note).toBe("the plan added 3 step(s); the 6-node cap trimmed 9");
});
