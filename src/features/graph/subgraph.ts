/**
 * Closing a set of nodes into a drawable subgraph, and counting the degree
 * inside it.
 *
 * WHY RE-READ rather than reuse what the walk saw: a walk stops expanding a
 * node once it is recorded, so an edge between two neighbours that were
 * discovered from opposite sides is never observed. Those sibling edges are
 * precisely what turns a star diagram into a picture of the code, so the
 * closure asks each drawn node for its edges once more and keeps the ones whose
 * far end is also drawn.
 *
 * `dropped` is not a diagnostic: an edge left out because its far end fell
 * outside the cap is a connection the picture does not show, and a reader who
 * is not told that reads the drawing as complete.
 */
import type { ReadOptions } from "./safe-read.js";
import { edgeKey, readNeighbors } from "./safe-read.js";
import type { Tracker } from "./truncation.js";
import type { GraphEdge, GraphStore } from "./types.js";

export interface Closure {
	/** Deduped, both ends inside the set. */
	edges: GraphEdge[];
	/** Distinct incident triples with an end outside it. */
	dropped: number;
}

export async function closure(
	store: GraphStore,
	inside: Set<string>,
	opts: ReadOptions,
	t: Tracker,
): Promise<Closure> {
	const kept = new Map<string, GraphEdge>();
	const outside = new Set<string>();
	for (const id of inside) {
		for (const n of await readNeighbors(store, id, opts, t)) {
			const key = edgeKey(n.edge);
			if (inside.has(n.edge.from) && inside.has(n.edge.to)) kept.set(key, n.edge);
			else outside.add(key);
		}
	}
	return { edges: [...kept.values()], dropped: outside.size };
}

/** Incidences per node id over a set of triples. A self-edge counts twice, as
 * it does in any degree count. */
export function degrees(edges: GraphEdge[]): Map<string, number> {
	const out = new Map<string, number>();
	for (const e of edges) {
		out.set(e.from, (out.get(e.from) ?? 0) + 1);
		out.set(e.to, (out.get(e.to) ?? 0) + 1);
	}
	return out;
}
