/**
 * User flows read off disk, and the field a bad one got wrong.
 *
 * A malformed flow is skipped ALONE and names its own failure — one bad file
 * must never cost a user the other five. And a graph that cannot run is
 * rejected HERE, at load, rather than after LangGraph has burned its recursion
 * limit on real model calls.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { loadFlows } from "../src/lang/flow-files.js";
import { parseFlowSpec } from "../src/lang/library.js";
import { planFlow } from "../src/lang/planner.js";
import { fluskHome } from "../src/session/paths.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-lang-planner-");
});

afterEach(() => {
	teardownTestHome();
});

const write = async (dir: string, name: string, spec: unknown): Promise<void> => {
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, name), JSON.stringify(spec), "utf8");
};

it("loads user flows from the project and from flusk's home, project first", async () => {
	const node = { id: "a", kind: "summarize", about: "say it" };
	await write(join(repo, ".flusk", "flows"), "mine.json", { name: "mine", entry: "a", nodes: [node] });
	await write(join(fluskHome(), "flows"), "shared.json", {
		name: "shared",
		entry: "a",
		nodes: [node],
	});
	const { flows, errors } = await loadFlows(repo);
	expect(flows.map((f) => f.name)).toEqual(["mine", "shared", "fix", "review", "explore", "ship"]);
	expect(errors).toEqual([]);
	expect(planFlow("anything", { flows, flow: "mine" }).spec.entry).toBe("a");
});

it("names the field a bad flow got wrong, and keeps the rest", async () => {
	const dir = join(repo, ".flusk", "flows");
	await write(dir, "broken.json", {
		name: "broken",
		entry: "a",
		nodes: [{ id: "a", kind: "cod" }],
	});
	await write(dir, "ok.json", { name: "ok", entry: "a", nodes: [{ id: "a", kind: "plan" }] });
	const { flows, errors } = await loadFlows(repo);
	expect(flows.map((f) => f.name)).toContain("ok");
	expect(flows.map((f) => f.name)).not.toContain("broken");
	expect(errors).toHaveLength(1);
	expect(errors[0]).toMatch(/broken\.json: nodes\[0\]\.kind must be one of plan, code/);
	// A graph that cannot run is rejected at LOAD, not after 25 paid model calls.
	const dangling = { name: "x", entry: "a", nodes: [{ id: "a", kind: "plan", next: ["b"] }] };
	expect(() => parseFlowSpec(dangling, "flow.json")).toThrow(
		/nodes\[0\]\.next points at unknown node "b"/,
	);
	const cyclic = {
		name: "x",
		entry: "a",
		nodes: [
			{ id: "a", kind: "plan", next: ["b"] },
			{ id: "b", kind: "code", next: ["a"] },
		],
	};
	expect(() => parseFlowSpec(cyclic, "flow.json")).toThrow(/is a cycle; the retry loop is/);
	const at = "flow.json";
	expect(() =>
		parseFlowSpec({ name: "x", entry: "b", nodes: [{ id: "a", kind: "plan" }] }, at),
	).toThrow("flow.json: entry must name one of: a");
	expect(() => parseFlowSpec({ nodes: [], entry: "a" }, at)).toThrow(/name must be a non-empty/);
	// A user flow cannot smuggle a prompt in past `about`.
	const prompt = { id: "a", kind: "code", about: `You are an expert. ${"Do this. ".repeat(9)}` };
	expect(() => parseFlowSpec({ name: "x", entry: "a", nodes: [prompt] }, at)).toThrow(
		/nodes\[0\]\.about must be a short phrase naming the job, not a prompt/,
	);
	expect(() =>
		parseFlowSpec({ name: "x", entry: "a", nodes: [{ id: "a", kind: "flow" }] }, at),
	).toThrow(/nodes\[0\]\.flow must name the flow to run/);
});
