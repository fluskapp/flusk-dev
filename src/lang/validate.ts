/**
 * Is this graph runnable at all? One answer, used at BOTH doors.
 *
 * `parseFlowSpec` (library.ts) reads user JSON and `compile` (graph.ts) builds
 * the runtime graph; before this file each checked a different subset, so a
 * user flow with a dangling edge listed happily and then pruned itself, and a
 * cyclic one burned the recursion limit in real model calls before LangGraph
 * complained in its own words.
 *
 * Cycles are rejected rather than run: a flow that wants to go round again is
 * asking for the runner's bounded retry (library.ts), which is not an edge.
 */
import type { FlowNode, FlowSpec } from "./types.js";

/** `nodes[2].next points at unknown node "x"` — the field, then the reason. */
const bad = (at: string, what: string): Error => new Error(`${at}: ${what}`);

function index(spec: FlowSpec, at: string): Map<string, FlowNode> {
	const byId = new Map<string, FlowNode>();
	spec.nodes.forEach((node, i) => {
		if (byId.has(node.id)) throw bad(at, `nodes[${i}].id duplicate node id "${node.id}"`);
		byId.set(node.id, node);
	});
	return byId;
}

/** The path a DFS is currently inside, so a back-edge can name the whole loop. */
type Colour = "open" | "done";

function cycleFrom(
	id: string,
	byId: Map<string, FlowNode>,
	seen: Map<string, Colour>,
	path: string[],
): string[] | null {
	if (seen.get(id) === "done") return null;
	if (seen.get(id) === "open") return [...path.slice(path.indexOf(id)), id];
	seen.set(id, "open");
	path.push(id);
	for (const to of byId.get(id)?.next ?? []) {
		const loop = cycleFrom(to, byId, seen, path);
		if (loop !== null) return loop;
	}
	path.pop();
	seen.set(id, "done");
	return null;
}

/**
 * Duplicate ids, a missing entry, edges into nothing, and back-edges. Throws
 * naming the field that is wrong; `at` is the caller's context (a file path
 * for a user flow, `flow "name"` for a compile).
 */
export function validateSpec(spec: FlowSpec, at: string): Map<string, FlowNode> {
	const byId = index(spec, at);
	if (!byId.has(spec.entry)) throw bad(at, `entry "${spec.entry}" is not a node of it`);
	spec.nodes.forEach((node, i) => {
		for (const to of node.next ?? []) {
			if (!byId.has(to)) throw bad(at, `nodes[${i}].next points at unknown node "${to}"`);
		}
	});
	const seen = new Map<string, Colour>();
	for (const node of spec.nodes) {
		const loop = cycleFrom(node.id, byId, seen, []);
		if (loop === null) continue;
		// The field at fault is the edge that closes the loop, not the root.
		const from = loop[loop.length - 2] ?? node.id;
		throw bad(
			at,
			`nodes[${spec.nodes.findIndex((n) => n.id === from)}].next: ` +
				`${loop.map((n) => `"${n}"`).join(" -> ")} is a cycle; ` +
				"the retry loop is the runner's, not an edge",
		);
	}
	return byId;
}
