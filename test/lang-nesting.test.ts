/**
 * Flows composing flows, with a stubbed runNode: no model, no network, no key.
 *
 * The load-bearing property is NAMESPACING. A nested flow's steps run under the
 * id of the node that ran them (`fix/code`), because a child sharing an id with
 * its parent otherwise overwrites the parent's artifact, its checkpoint replay
 * slot and its journal stage — three silent corruptions that all look like one
 * step having run twice.
 */
import { expect, it } from "vitest";
import { type LangDeps, loadLang } from "../src/features/flows/deps.js";
import { compile, MAX_FLOW_DEPTH } from "../src/features/flows/graph.js";
import { outcomeOf } from "../src/features/flows/nodes.js";
import type { FlowContext, FlowSpec } from "../src/features/flows/types.js";
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

const _linear = spec(
	"fix",
	[
		{ id: "plan", kind: "plan", next: ["code"] },
		{ id: "code", kind: "code", about: "make the tests pass", next: ["say"] },
		{ id: "say", kind: "summarize" },
	],
	"plan",
);

withLang("flows compose", () => {
	const child = spec("child", [{ id: "inner", kind: "code" }], "inner");
	const parent = spec(
		"parent",
		[
			{ id: "sub", kind: "flow", flow: "child", next: ["say"] },
			{ id: "say", kind: "summarize" },
		],
		"sub",
	);
	const resolve = (specs: FlowSpec[]) => (name: string) =>
		specs.find((s) => s.name === name) ?? null;

	it("namespaces a nested flow's ids under the node that ran it", async () => {
		const { ctx, seen } = stub();
		const state = await compile(parent, deps, { ...ctx, resolveFlow: resolve([child]) }).invoke(
			start,
		);
		// `sub/inner`, not `inner`: a child sharing an id with its parent would
		// otherwise overwrite the parent's artifact and checkpoint slot.
		expect(seen).toEqual(["sub/inner", "say"]);
		expect(state.steps.map((s) => s.nodeId)).toEqual(["sub/inner", "sub", "say"]);
		expect(state.artifacts["sub/inner"]).toBe("sub/inner of make the tests pass");
		expect(state.artifacts.inner).toBeUndefined();
		expect(outcomeOf(state)).toBe("completed");
	});

	it("keeps a child's step distinct from a parent step of the same name", async () => {
		const twin = spec("twin", [{ id: "say", kind: "code" }], "say");
		const outer = spec(
			"outer",
			[
				{ id: "sub", kind: "flow", flow: "twin", next: ["say"] },
				{ id: "say", kind: "summarize" },
			],
			"sub",
		);
		const { ctx } = stub();
		const state = await compile(outer, deps, { ...ctx, resolveFlow: resolve([twin]) }).invoke(
			start,
		);
		expect(Object.keys(state.artifacts).sort()).toEqual(["say", "sub", "sub/say"]);
	});

	it(`fails past ${MAX_FLOW_DEPTH} levels of nesting`, async () => {
		const loop = spec("loop", [{ id: "again", kind: "flow", flow: "loop" }], "again");
		const ctx = { ...stub().ctx, resolveFlow: resolve([loop]) };
		await expect(compile(loop, deps, ctx).invoke(start)).rejects.toThrow(/nests deeper than 3/);
	});

	it("fails on a flow node whose flow does not exist", async () => {
		const ctx = { ...stub().ctx, resolveFlow: () => null };
		await expect(compile(parent, deps, ctx).invoke(start)).rejects.toThrow(/unknown flow "child"/);
	});
});

withLang("a spec that cannot run is rejected before it runs", () => {
	it("names the field pointing at a node that does not exist", () => {
		const broken = spec("broken", [{ id: "a", kind: "plan", next: ["nope"] }], "a");
		expect(() => compile(broken, deps, stub().ctx)).toThrow(/unknown node "nope"/);
	});

	it("rejects a cycle rather than burning the recursion limit on model calls", () => {
		const looped = spec(
			"looped",
			[
				{ id: "a", kind: "plan", next: ["b"] },
				{ id: "b", kind: "code", next: ["a"] },
			],
			"a",
		);
		expect(() => compile(looped, deps, stub().ctx)).toThrow(/"a" -> "b" -> "a" is a cycle/);
	});
});
