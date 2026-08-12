/**
 * The flow runtime with a stubbed runNode: no model, no network, no key. Under
 * test is the graph — order, state threading, END, nesting, the depth cap —
 * not what a step would say. Skips when the optional packages are absent —
 * the same condition `flusk flow` degrades on — but only when FLUSK_SKIP_LANG says
 * so, because a silently skipped suite reads exactly like a passing one.
 *
 * There is no runFlow here: `compile(...).invoke(...)` plus the shared
 * `outcomeOf` is how the runner judges a trace, so it is how these judge one.
 */
import { expect, it } from "vitest";
import { type LangDeps, loadLang } from "../src/features/flows/deps.js";
import { compile } from "../src/features/flows/graph.js";
import { outcomeOf } from "../src/features/flows/nodes.js";
import type { FlowContext, FlowSpec, FlowState } from "../src/features/flows/types.js";
import { withLangRuntime } from "./lang-guard.js";

const loaded = await loadLang();
const withLang = await withLangRuntime();
const deps = loaded as LangDeps;
const start = { task: "make the tests pass", project: "flusk" };

/** Records what ran and what each node could see when it ran. */
function stub(fail: string[] = []) {
	const seen: string[] = [];
	const priors = new Map<string, string[]>();
	const ctx: FlowContext = {
		runNode: async (node, state) => {
			seen.push(node.id);
			const prior = state.steps.map((s) => s.nodeId);
			priors.set(node.id, prior);
			const output = `${node.id} of ${state.task}`;
			return { ok: !fail.includes(node.id), output, promptTokens: 7, costUsd: 0.5 };
		},
	};
	return { ctx, seen, priors };
}

function spec(name: string, nodes: FlowSpec["nodes"], entry: string): FlowSpec {
	return { name, nodes, entry };
}

const linear = spec(
	"fix",
	[
		{ id: "plan", kind: "plan", next: ["code"] },
		{ id: "code", kind: "code", about: "make the tests pass", next: ["say"] },
		{ id: "say", kind: "summarize" },
	],
	"plan",
);

withLang("compile", () => {
	it("runs a linear flow in order, threading state between steps", async () => {
		const { ctx, seen, priors } = stub();
		const state = await compile(linear, deps, ctx).invoke(start);
		expect(seen).toEqual(["plan", "code", "say"]);
		expect(priors.get("code")).toEqual(["plan"]);
		expect(state.steps.map((s) => s.nodeId)).toEqual(["plan", "code", "say"]);
		expect(state.artifacts.code).toBe("code of make the tests pass");
		expect(state.costUsd).toBeCloseTo(1.5);
		expect(state.task).toBe(start.task);
		expect(state.steps[0]?.endedAt).toBeTruthy();
	});

	it("ends at a node with no next, and fans out to every next", async () => {
		const branched = spec(
			"branch",
			[
				{ id: "plan", kind: "plan", next: ["look", "read"] },
				{ id: "look", kind: "review" },
				{ id: "read", kind: "review" },
			],
			"plan",
		);
		const { ctx, seen } = stub();
		const state = await compile(branched, deps, ctx).invoke(start);
		expect(seen).toContain("look");
		expect(seen).toContain("read");
		expect(Object.keys(state.artifacts).sort()).toEqual(["look", "plan", "read"]);
	});

	it("rejects a spec that points at a node it does not have", () => {
		const broken = spec("broken", [{ id: "a", kind: "plan", next: ["nope"] }], "a");
		expect(() => compile(broken, deps, stub().ctx)).toThrow(/unknown node "nope"/);
	});
});

withLang("the verdict a trace carries", () => {
	it("completes when every blocking step's last attempt passed", async () => {
		const state = await compile(linear, deps, stub().ctx).invoke(start);
		expect(outcomeOf(state)).toBe("completed");
		expect(state.steps).toHaveLength(3);
	});

	it("blocks at a failed blocking step and stops there", async () => {
		const { ctx, seen } = stub(["code"]);
		const state = await compile(linear, deps, ctx).invoke(start);
		expect(outcomeOf(state)).toBe("blocked");
		expect(seen).toEqual(["plan", "code"]);
	});

	it("carries on past a failed non-blocking step", async () => {
		const soft = spec(
			"soft",
			[
				{ id: "look", kind: "review", next: ["say"] },
				{ id: "say", kind: "summarize" },
			],
			"look",
		);
		const { ctx, seen } = stub(["look"]);
		const state = await compile(soft, deps, ctx).invoke(start);
		expect(seen).toEqual(["look", "say"]);
		expect(outcomeOf(state)).toBe("completed");
	});

	it("does not call a recovered node failed: only the LAST attempt counts", () => {
		const attempt = (nodeId: string, ok: boolean): FlowState["steps"][number] => ({
			nodeId,
			kind: "code",
			startedAt: "2026-08-11T00:00:00.000Z",
			ok,
			output: "x",
			promptTokens: 1,
		});
		expect(outcomeOf({ steps: [attempt("code", false), attempt("code", true)] })).toBe("completed");
		expect(outcomeOf({ steps: [attempt("code", true), attempt("code", false)] })).toBe("blocked");
	});
});
