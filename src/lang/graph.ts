/**
 * The LangGraph runtime: a FlowSpec compiled into a StateGraph over FlowState.
 *
 * The graph is built from the spec at run time — shape, edges and nesting all
 * decided from data, never hardcoded. Node bodies do no thinking of their own;
 * they call `ctx.runNode`, the seam where the history composer turns a node's
 * `about` phrase into a prompt. That is why no prompt appears in this file.
 *
 * State threads through LangGraph channels, not a shared object: artifacts
 * merge, cost sums, steps append. A failed blocking step routes to END through
 * a conditional edge rather than throwing, so a blocked run keeps its trace.
 *
 * A nested flow's ids are NAMESPACED under the node that runs it (`fix/code`,
 * the shape src/ui/flow-plan.ts already shows), because a child sharing an id
 * with its parent otherwise overwrites the parent's artifact, its checkpoint
 * replay slot and its journal stage.
 *
 * This file compiles graphs and nothing else: how a finished run is judged
 * lives in nodes.ts (`outcomeOf`), and running one lives in runner.ts.
 */
import type { CompiledFlow, LangDeps } from "./deps.js";
import { behaviourOf, stepFrom, updateFrom } from "./nodes.js";
import type { FlowContext, FlowNode, FlowSpec, FlowState, FlowStep, NodeOutcome } from "./types.js";
import { validateSpec } from "./validate.js";

/** A flow may contain a flow, three deep. Beyond that it is a bug, not a design. */
export const MAX_FLOW_DEPTH = 3;

function flowSchema(deps: LangDeps): unknown {
	const a = deps.Annotation;
	const last = <T>(v: T): unknown => a<T>({ reducer: (_o, n) => n, default: () => v });
	return a.Root({
		task: last(""),
		project: last(""),
		artifacts: a<Record<string, string>>({
			reducer: (o, n) => ({ ...o, ...n }),
			default: () => ({}),
		}),
		costUsd: a<number>({ reducer: (o, n) => o + n, default: () => 0 }),
		steps: a<FlowStep[]>({ reducer: (o, n) => [...o, ...n], default: () => [] }),
	});
}

/** The same flow with every id (and edge, and entry) living under `prefix`. */
export function namespaced(spec: FlowSpec, prefix: string): FlowSpec {
	const at = (id: string): string => `${prefix}/${id}`;
	return {
		...spec,
		entry: at(spec.entry),
		nodes: spec.nodes.map((n) => ({
			...n,
			id: at(n.id),
			...(n.next === undefined ? {} : { next: n.next.map(at) }),
		})),
	};
}

/** A nested flow: compiled and run in place, its trace folded into the parent. */
async function runNested(
	node: FlowNode,
	state: FlowState,
	deps: LangDeps,
	ctx: FlowContext,
	depth: number,
): Promise<{ outcome: NodeOutcome; child: FlowState }> {
	const name = node.flow ?? "";
	if (depth + 1 > MAX_FLOW_DEPTH) {
		throw new Error(
			`flow "${name}" nests deeper than ${MAX_FLOW_DEPTH} at node "${node.id}" — flatten it`,
		);
	}
	const spec = ctx.resolveFlow?.(name) ?? null;
	if (spec === null) throw new Error(`node "${node.id}" runs unknown flow "${name}"`);
	const child = await compile(namespaced(spec, node.id), deps, ctx, depth + 1).invoke({
		task: state.task,
		project: state.project,
		artifacts: state.artifacts,
	});
	const ok = child.steps.every((s) => s.ok || !behaviourOf(s.kind).blocking);
	const tokens = child.steps.reduce((n, s) => n + s.promptTokens, 0);
	return { outcome: { ok, output: child.steps.at(-1)?.output ?? "", promptTokens: tokens }, child };
}

function stepFn(node: FlowNode, deps: LangDeps, ctx: FlowContext, depth: number) {
	return async (state: FlowState): Promise<Partial<FlowState>> => {
		const startedAt = new Date().toISOString();
		const nested = node.kind === "flow" ? await runNested(node, state, deps, ctx, depth) : null;
		const outcome = nested?.outcome ?? (await ctx.runNode(node, state));
		const step = stepFrom(node, startedAt, outcome);
		const update = updateFrom(node, step, outcome);
		if (nested === null) return update;
		return {
			artifacts: { ...nested.child.artifacts, ...update.artifacts },
			costUsd: nested.child.costUsd,
			steps: [...nested.child.steps, step],
		};
	};
}

/** Compiles `spec` into a runnable graph. Edges come from `next`; no `next` is END. */
export function compile(
	spec: FlowSpec,
	deps: LangDeps,
	ctx: FlowContext,
	depth = 0,
): CompiledFlow<FlowState> {
	const byId = validateSpec(spec, `flow "${spec.name}"`);
	const graph = new deps.StateGraph<FlowState>(flowSchema(deps));
	for (const node of byId.values()) graph.addNode(node.id, stepFn(node, deps, ctx, depth));
	graph.addEdge(deps.START, spec.entry);
	for (const [id, node] of byId) {
		const next = node.next ?? [];
		if (next.length === 0) {
			graph.addEdge(id, deps.END);
		} else if (behaviourOf(node.kind).blocking) {
			const onward = (s: FlowState): string[] | string =>
				s.steps.at(-1)?.ok === false ? deps.END : next;
			graph.addConditionalEdges(id, onward, [...next, deps.END]);
		} else {
			for (const to of next) graph.addEdge(id, to);
		}
	}
	return graph.compile();
}
