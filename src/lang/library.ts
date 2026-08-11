/**
 * The flows you get without writing anything.
 *
 * Every one is DATA: ids, kinds, and at most a phrase naming the job. No prompt
 * appears here, and none can — a phrase is what the composer turns into one.
 * "ship" is the point of the file: it runs "fix" as a single node, which is what
 * "flows compose" means in practice. The bounded loop back to code on a failed
 * gate is the runner's retry, not an edge: a blocking step that fails routes to
 * END by construction (graph.ts), so a spec must not pretend to express it.
 *
 * User flows are the same data, parsed by `parseFlowSpec` below; reading them
 * off disk is flow-files.ts.
 */
import { isPhrase } from "./context.js";
import { BEHAVIOURS } from "./nodes.js";
import type { FlowNode, FlowSpec, NodeKind } from "./types.js";
import { validateSpec } from "./validate.js";

const KINDS = Object.keys(BEHAVIOURS) as NodeKind[];

/** Entry is the first node: a flow starts where it is written. */
const flow = (name: string, description: string, nodes: FlowNode[]): FlowSpec => ({
	name,
	description,
	nodes,
	entry: nodes[0]?.id ?? "",
});

export const FIX = flow(
	"fix",
	"plan it, change it, prove it — the change retried on a failed gate",
	[
		{ id: "plan", kind: "plan", about: "the change this task needs", next: ["code"] },
		{ id: "code", kind: "code", about: "make the change", next: ["verify"] },
		{ id: "verify", kind: "verify", about: "prove the change works" },
	],
);

export const REVIEW = flow("review", "plan what to look for, review it, check the evidence", [
	{ id: "plan", kind: "plan", about: "what this review must check", next: ["review"] },
	{ id: "review", kind: "review", about: "find what is wrong", next: ["verify"] },
	{ id: "verify", kind: "verify", about: "confirm the findings hold" },
]);

export const EXPLORE = flow("explore", "understand the ground, then say what is there", [
	{ id: "plan", kind: "plan", about: "how to answer this", next: ["say"] },
	{ id: "say", kind: "summarize", about: "what is there" },
]);

export const SHIP = flow("ship", "the fix flow, then a review of it, then the gate", [
	{ id: "fix", kind: "flow", flow: "fix", about: "make the change", next: ["review"] },
	{ id: "review", kind: "review", about: "find what is wrong", next: ["verify"] },
	{ id: "verify", kind: "verify", about: "prove it is ready to ship" },
]);

export const BUILT_IN: FlowSpec[] = [FIX, REVIEW, EXPLORE, SHIP];

export function flowByName(name: string, flows: FlowSpec[] = BUILT_IN): FlowSpec | null {
	return flows.find((f) => f.name === name) ?? null;
}

/** The `resolveFlow` seam a nested "flow" node is looked up through. */
export function flowResolver(flows: FlowSpec[] = BUILT_IN): (name: string) => FlowSpec | null {
	return (name) => flowByName(name, flows);
}

const bad = (at: string, field: string, why: string): Error => new Error(`${at}: ${field} ${why}`);

function parseNode(value: unknown, at: string, field: string): FlowNode {
	if (typeof value !== "object" || value === null) throw bad(at, field, "is not an object");
	const raw = value as Record<string, unknown>;
	if (typeof raw.id !== "string" || raw.id.trim() === "") {
		throw bad(at, `${field}.id`, "must be a non-empty string");
	}
	if (typeof raw.kind !== "string" || !KINDS.includes(raw.kind as NodeKind)) {
		throw bad(at, `${field}.kind`, `must be one of ${KINDS.join(", ")}`);
	}
	const next = raw.next ?? [];
	if (!Array.isArray(next) || next.some((n) => typeof n !== "string")) {
		throw bad(at, `${field}.next`, "must be an array of node ids");
	}
	if (raw.kind === "flow" && typeof raw.flow !== "string") {
		throw bad(at, `${field}.flow`, "must name the flow to run");
	}
	// The one rule that keeps the feature honest: a step names its job, and a
	// paragraph is not a name. Prompts are the composer's to write, not yours.
	if (typeof raw.about === "string" && !isPhrase(raw.about)) {
		throw bad(at, `${field}.about`, "must be a short phrase naming the job, not a prompt");
	}
	const opt = (k: "about" | "model" | "flow"): Record<string, string> =>
		typeof raw[k] === "string" ? { [k]: raw[k] as string } : {};
	const kind = raw.kind as NodeKind;
	return {
		id: raw.id,
		kind,
		next: next as string[],
		...opt("about"),
		...opt("model"),
		...opt("flow"),
	};
}

/** A FlowSpec, or an Error naming the field that is wrong. */
export function parseFlowSpec(value: unknown, at: string): FlowSpec {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw bad(at, "flow", "is not a JSON object");
	}
	const raw = value as Record<string, unknown>;
	if (typeof raw.name !== "string" || raw.name.trim() === "") {
		throw bad(at, "name", "must be a non-empty string");
	}
	if (!Array.isArray(raw.nodes) || raw.nodes.length === 0) {
		throw bad(at, "nodes", "must be a non-empty array");
	}
	const nodes = raw.nodes.map((n, i) => parseNode(n, at, `nodes[${i}]`));
	if (typeof raw.entry !== "string" || !nodes.some((n) => n.id === raw.entry)) {
		throw bad(at, "entry", `must name one of: ${nodes.map((n) => n.id).join(", ")}`);
	}
	const spec: FlowSpec = { name: raw.name, nodes, entry: raw.entry };
	if (typeof raw.description === "string") spec.description = raw.description;
	// Edges and cycles, checked HERE rather than at compile: a dangling edge
	// otherwise listed as a pruned graph and a cycle only surfaced as
	// LangGraph's own recursion limit, after 25 paid model calls.
	validateSpec(spec, at);
	return spec;
}
