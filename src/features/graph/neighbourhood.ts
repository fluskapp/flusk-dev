/**
 * The local subgraph around a node, capped and ranked, in a shape a renderer
 * can lay out directly. It is the query behind "show me around this file", and
 * the one where a cap matters most: a hub node has hundreds of edges, and the
 * honest picture of a hub is a readable slice plus the admission that it IS a
 * slice — not a hairball nobody can read.
 *
 * CLOSED BY CONSTRUCTION: only edges whose BOTH ends are in the returned nodes
 * come back, so a renderer never receives an edge pointing at a node it was not
 * given. The closure is re-read in `subgraph.ts` rather than taken from the
 * walk, because a walk stops as soon as it has its nodes and would leave out
 * the edges BETWEEN two neighbours — exactly the ones that make a drawing worth
 * looking at. `edgesDropped` counts what the closure cost, so the picture never
 * implies the drawn nodes have no other connections.
 *
 * TWO RANKINGS, on purpose. Selection ranks candidates by depth, then by how
 * connected the WALK saw them; display then re-ranks by `degree` inside the
 * final subgraph, which is the number a reader can literally count on screen.
 * Ranking by a degree the caller cannot see would be unauditable.
 */
import type { Neighbourhood, NeighbourNode } from "./query-types.js";
import { readNode } from "./safe-read.js";
import { closure, degrees } from "./subgraph.js";
import { cmp, mergeTruncation, tracker } from "./truncation.js";
import type { EdgeKind, GraphStore } from "./types.js";
import { type WalkHit, walk } from "./walk.js";

export interface NeighbourhoodOptions {
	/** Hops from the centre. Default 2. */
	radius?: number;
	/** Max nodes drawn, excluding the centre. Default 40. */
	limit?: number;
	/** Max edges read per node. Default 500. */
	fanout?: number;
	/** Absent means every kind — the local picture, not one relation. */
	kinds?: EdgeKind[];
}

export async function neighbourhood(
	store: GraphStore,
	root: string,
	opts: NeighbourhoodOptions = {},
): Promise<Neighbourhood> {
	const t = tracker();
	const limit = opts.limit ?? 40;
	const fanout = opts.fanout ?? 500;
	const res = await walk(store, root, {
		direction: "both",
		kinds: opts.kinds,
		maxDepth: opts.radius ?? 2,
		// Deliberately looser than the node cap: ranking needs candidates to
		// choose between, and the walk reports its own cap either way.
		limit: limit * 3,
		fanout,
	});
	const resolved = res.hits.filter((h) => h.node !== null);
	const seen = degrees(res.edges);
	const chosen = [...resolved]
		.sort(
			(a, b) =>
				a.depth - b.depth || (seen.get(b.id) ?? 0) - (seen.get(a.id) ?? 0) || cmp(a.id, b.id),
		)
		.slice(0, limit);
	if (resolved.length > chosen.length) {
		t.hit("limit");
		t.drop(resolved.length - chosen.length);
	}
	const inside = new Set<string>([root, ...chosen.map((h) => h.id)]);
	const drawn = await closure(store, inside, { direction: "both", kinds: opts.kinds, fanout }, t);
	const degree = degrees(drawn.edges);
	const nodes = chosen.map((h) => row(h, degree.get(h.id) ?? 0)).sort(rank);
	return {
		root,
		center: await readNode(store, root, t),
		nodes,
		edges: drawn.edges,
		edgesDropped: drawn.dropped,
		truncation: mergeTruncation([res.truncation, t.done()]),
		unresolved: res.hits.length - resolved.length,
	};
}

function row(hit: WalkHit, degree: number): NeighbourNode {
	const last = hit.path[hit.path.length - 1];
	return {
		// Non-null by the filter above; the walk never invents a node, so a row
		// can never claim a file that no builder has put.
		node: hit.node as NonNullable<WalkHit["node"]>,
		depth: hit.depth,
		via: last?.kind ?? "defines",
		path: hit.path,
		degree,
		score: degree / Math.max(hit.depth, 1),
	};
}

function rank(a: NeighbourNode, b: NeighbourNode): number {
	return a.depth - b.depth || b.score - a.score || cmp(a.node.id, b.node.id);
}
