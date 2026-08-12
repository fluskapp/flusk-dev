/**
 * Where the bounded retry re-enters the graph, and what it compiles.
 *
 * Both answers are about IDs the current spec owns. A nested flow's steps carry
 * namespaced ids (graph.ts), so a naive "last code step in the trace" search
 * picks one the outer graph has never heard of and turns a retryable run into a
 * crash. And LangGraph refuses to compile an unreachable node — rightly, since
 * in any other graph that is a typo — so re-entering mid-flow means compiling
 * the sub-graph rather than the whole spec.
 */
import { behaviourOf } from "./nodes.js";
import type { FlowSpec, FlowState } from "./types.js";

/**
 * The sub-graph reachable from `entry`. A pass that re-enters mid-flow leaves
 * the steps behind it orphaned, and LangGraph refuses to compile an unreachable
 * node — rightly, since in any other graph that is a typo.
 */
export function fromEntry(spec: FlowSpec, entry: string): FlowSpec {
	const byId = new Map(spec.nodes.map((n) => [n.id, n]));
	const seen = new Set<string>();
	for (const queue = [entry]; queue.length > 0; ) {
		const id = queue.shift() ?? "";
		if (seen.has(id) || !byId.has(id)) continue;
		seen.add(id);
		queue.push(...(byId.get(id)?.next ?? []));
	}
	return { ...spec, entry, nodes: spec.nodes.filter((n) => seen.has(n.id)) };
}

/**
 * Where a failed gate sends the flow back to, or undefined when nowhere sane.
 *
 * Only ids THIS spec owns are candidates: a nested flow's steps carry namespaced
 * ids (graph.ts) that the outer graph cannot be entered at, and re-entering at
 * one used to abort the whole run instead of retrying it. A nested flow whose
 * own gate failed is re-entered at its `flow` node — the nested run is the unit
 * the outer spec can actually replay.
 */
export function reentry(spec: FlowSpec, state: FlowState): string | undefined {
	const last = state.steps.at(-1);
	if (last === undefined || last.ok || !behaviourOf(last.kind).blocking) return undefined;
	const own = new Set(spec.nodes.map((n) => n.id));
	if (last.kind === "flow") return own.has(last.nodeId) ? last.nodeId : undefined;
	if (last.kind !== "verify") return undefined;
	return [...state.steps].reverse().find((s) => s.kind === "code" && own.has(s.nodeId))?.nodeId;
}
