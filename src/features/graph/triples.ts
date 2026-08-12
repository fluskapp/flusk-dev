/**
 * The GraphNode/GraphEdge ↔ triple mapping, alone, because types.ts promises
 * it stays MECHANICAL: an edge `(from, kind, to)` IS `(subject, predicate,
 * object)`, and a node is facts on the subject `node.id`. Keeping the mapping
 * in one file with no I/O in it is what makes swapping JSONL for the local
 * triple store one adapter file rather than a rewrite.
 *
 * The attribute predicates (`kind`, `label`, `file`, `line`) are deliberately
 * disjoint from every EdgeKind, so ONE predicate namespace carries both node
 * facts and edges and a reader can tell them apart without a second field.
 * Adding an EdgeKind called "file" would silently turn every node's display
 * path into an edge; `isEdgeKind` is the guard, and the sets are spelled out
 * here rather than derived, because a type is erased at runtime.
 *
 * `line` round-trips through a string: the store is a triple store, its object
 * is text, and a number that arrives back as "12" is the sort of thing that
 * reads fine and sorts wrong.
 */
import type { EdgeKind, GraphEdge, GraphNode, NodeKind } from "./types.js";

/** One row on disk. `w` is GraphEdge.weight and is absent on node facts. */
export interface Triple {
	s: string;
	p: string;
	o: string;
	w?: number;
}

const EDGE_KINDS: ReadonlySet<string> = new Set([
	"imports",
	"references",
	"defines",
	"changed_with",
	"touched_by",
	"documents",
]);

const NODE_KINDS: ReadonlySet<string> = new Set(["file", "symbol", "commit", "run", "doc"]);

export const isEdgeKind = (p: string): p is EdgeKind => EDGE_KINDS.has(p);
export const isNodeKind = (k: string): k is NodeKind => NODE_KINDS.has(k);

/** A node as facts on its own id. Absent fields emit no triple at all. */
export function nodeTriples(node: GraphNode): Triple[] {
	const out: Triple[] = [
		{ s: node.id, p: "kind", o: node.kind },
		{ s: node.id, p: "label", o: node.label },
	];
	if (node.file !== undefined) out.push({ s: node.id, p: "file", o: node.file });
	if (node.line !== undefined) out.push({ s: node.id, p: "line", o: String(node.line) });
	// Only ever written as "1": absence is the answer "nothing was capped", and a
	// "0" on disk would have to be told apart from a node written before the flag.
	if (node.capped === true) out.push({ s: node.id, p: "capped", o: "1" });
	return out;
}

export function edgeTriple(edge: GraphEdge): Triple {
	const t: Triple = { s: edge.from, p: edge.kind, o: edge.to };
	if (edge.weight !== undefined) t.w = edge.weight;
	return t;
}

export function toEdge(t: Triple): GraphEdge | null {
	if (!isEdgeKind(t.p)) return null;
	const edge: GraphEdge = { from: t.s, kind: t.p, to: t.o };
	if (typeof t.w === "number" && Number.isFinite(t.w)) edge.weight = t.w;
	return edge;
}

/** A node under construction: facts arrive one triple at a time, in any order. */
export type NodeFacts = Partial<GraphNode>;

/** Folds one attribute triple into `facts`. Last write wins, per invariant 6. */
export function applyFact(facts: NodeFacts, t: Triple): void {
	if (t.p === "kind" && isNodeKind(t.o)) facts.kind = t.o;
	else if (t.p === "label") facts.label = t.o;
	else if (t.p === "file") facts.file = t.o;
	else if (t.p === "line") {
		const n = Number.parseInt(t.o, 10);
		if (Number.isFinite(n)) facts.line = n;
	} else if (t.p === "capped") facts.capped = t.o === "1";
}

/**
 * A node, or null when its facts never included a valid `kind` — a subject
 * that only ever appeared as an edge's far end is a DANGLING reference, and
 * the store reports it as `node: null` rather than inventing one (invariant 7).
 */
export function toNode(id: string, facts: NodeFacts): GraphNode | null {
	if (facts.kind === undefined) return null;
	const node: GraphNode = { id, kind: facts.kind, label: facts.label ?? id };
	if (facts.file !== undefined) node.file = facts.file;
	if (facts.line !== undefined) node.line = facts.line;
	if (facts.capped === true) node.capped = true;
	return node;
}

export function encode(t: Triple): string {
	return JSON.stringify(t);
}

/** null for a blank or unparseable line: a torn tail must not empty the graph. */
export function decode(line: string): Triple | null {
	if (line.trim() === "") return null;
	try {
		const v = JSON.parse(line) as Partial<Triple>;
		if (typeof v.s !== "string" || typeof v.p !== "string" || typeof v.o !== "string") return null;
		return typeof v.w === "number"
			? { s: v.s, p: v.p, o: v.o, w: v.w }
			: { s: v.s, p: v.p, o: v.o };
	} catch {
		return null;
	}
}
