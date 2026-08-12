/**
 * Every store read the queries make goes through here, for two reasons.
 *
 * DEGRADE, NEVER THROW (invariant 12). The port says a store does not throw,
 * but an adapter is code with its own bugs and its own I/O, and a read path
 * that dies on someone else's exception is worse than one that answers short
 * and marks itself truncated.
 *
 * DETERMINISTIC BATCHES. Which path a node carries as its evidence is decided
 * by discovery order, so a store returning edges in hash order would make the
 * same graph explain itself differently on every call. Sorting by the triple
 * itself pins that down without the store having to promise anything.
 */

import { cmp, type Tracker } from "./truncation.js";
import type { EdgeKind, GraphEdge, GraphNode, GraphStore, Neighbor } from "./types.js";

export interface ReadOptions {
	direction: "in" | "out" | "both";
	kinds?: EdgeKind[];
	/** Max edges read per node. */
	fanout: number;
}

/** Stable identity of a triple, for dedup and for ordering. */
export function edgeKey(e: GraphEdge): string {
	return `${e.from} ${e.kind} ${e.to}`;
}

/** The end of the triple that is NOT the node we expanded from. */
export function far(e: GraphEdge, id: string): string {
	return e.from === id ? e.to : e.from;
}

/** One node's edges: sorted, capped, and never throwing. */
export async function readNeighbors(
	store: GraphStore,
	id: string,
	opts: ReadOptions,
	t: Tracker,
): Promise<Neighbor[]> {
	try {
		const list = await store.neighbors(id, {
			direction: opts.direction,
			kinds: opts.kinds,
			limit: opts.fanout,
		});
		// A full batch means the store stopped listing, not that the node has
		// exactly `fanout` edges: everything past this node is a floor.
		if (list.length >= opts.fanout) t.hit("fanout");
		return [...list].sort((a, b) => cmp(edgeKey(a.edge), edgeKey(b.edge)));
	} catch {
		t.hit("store_error");
		return [];
	}
}

export async function readNode(
	store: GraphStore,
	id: string,
	t: Tracker,
): Promise<GraphNode | null> {
	try {
		return await store.node(id);
	} catch {
		t.hit("store_error");
		return null;
	}
}
