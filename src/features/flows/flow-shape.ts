/**
 * The SHAPE of a flow, as text and as a list — no prompts, no model, no I/O.
 *
 * Split from flow-plan.ts because three callers want only this: `flusk flow list`
 * and the Flows panel render the arrow chain, and the dry plan walks the
 * expansion. Nesting is spliced in where it sits, which is what makes
 * composition visible in the shape rather than only in the docs.
 */
import type { FlowNode, FlowSpec } from "./types.js";

/** Resolves a nested "flow" node's target, the seam src/lang/library.ts fills. */
export type Resolver = (name: string) => FlowSpec | null;

/** A flow may show a flow three deep — src/lang/graph.ts's own nesting limit. */
const MAX_DEPTH = 3;

/** Nodes in reading order from the entry: a depth-first walk of `next`. */
export function order(spec: FlowSpec): FlowNode[] {
	const byId = new Map(spec.nodes.map((n) => [n.id, n]));
	const out: FlowNode[] = [];
	const seen = new Set<string>();
	const walk = (id: string): void => {
		const node = byId.get(id);
		if (node === undefined || seen.has(id)) return;
		seen.add(id);
		out.push(node);
		for (const next of node.next ?? []) walk(next);
	};
	walk(spec.entry);
	return out;
}

/** The one-line arrow chain: `fix[plan -> code -> verify] -> review -> verify`. */
export function shapeOf(spec: FlowSpec, resolve?: Resolver, depth = 0): string {
	return order(spec)
		.map((node) => {
			const sub =
				node.kind === "flow" && depth < MAX_DEPTH ? (resolve?.(node.flow ?? "") ?? null) : null;
			return sub === null ? node.id : `${sub.name}[${shapeOf(sub, resolve, depth + 1)}]`;
		})
		.join(" -> ");
}

export interface PlacedNode {
	/** Path-shaped for a nested step: `fix/code`. */
	id: string;
	node: FlowNode;
}

/** Every step that will run a model, nested flows spliced in where they sit. */
export function expand(spec: FlowSpec, resolve: Resolver, prefix = "", depth = 0): PlacedNode[] {
	const out: PlacedNode[] = [];
	for (const node of order(spec)) {
		const id = `${prefix}${node.id}`;
		const sub = node.kind === "flow" && depth < MAX_DEPTH ? resolve(node.flow ?? "") : null;
		if (sub !== null) out.push(...expand(sub, resolve, `${id}/`, depth + 1));
		else out.push({ id, node });
	}
	return out;
}
