/**
 * "If I change this, what else is implicated?" — the query the graph exists to
 * answer, and the one most easily made useless. Unbounded transitive impact on
 * a real repo returns most of the repo: technically true, and no help at all.
 * So it is depth-bounded, capped, ranked, and every row ships the exact hops
 * that put it there.
 *
 * DIRECTION IS INBOUND (invariant 11). Outbound answers "what does this depend
 * on", which is a different question that reads just as plausible in a result
 * list — reversing the walk silently swaps one for the other.
 *
 * RANKING, in full, because a rank nobody can reproduce is a rank nobody can
 * argue with: depth ascending (nearest first, as the contract's `impacted`
 * says), then `score` descending, then node id ascending so the order is total
 * and stable. `score` is the WEAKEST hop on the path divided by the depth —
 * a chain of implication is only as strong as its thinnest link, and distance
 * dilutes it. Hop strength is the edge's `weight` (reference count) or 1 when
 * the builder set none; it is strength, never confidence (invariant 10).
 *
 * The cap is applied by the walk in breadth-first order, and the ranking's
 * primary key is that same depth, so a cap can only cost rows in the last ring
 * reached — and `truncation` says when it did.
 */
import type { BlastRadiusReport, ImpactedNode } from "./query-types.js";
import { cmp } from "./truncation.js";
import type { EdgeKind, GraphEdge, GraphStore } from "./types.js";
import { type WalkHit, walk } from "./walk.js";

/** Implication travels along these three and no others: a `touched_by` or
 * `changed_with` hop would mix historical correlation into a structural claim. */
const IMPLICATION: EdgeKind[] = ["imports", "references", "defines"];

export interface BlastOptions {
	/** Hops from the root. Default 3: past that, on real code, everything is
	 * reachable from everything and the answer stops discriminating. */
	maxDepth?: number;
	/** Max rows. Default 100. */
	limit?: number;
	/** Max edges read per node. Default 500. */
	fanout?: number;
	/** Narrow the edge kinds; defaults to imports/references/defines. */
	kinds?: EdgeKind[];
}

export async function blastRadius(
	store: GraphStore,
	root: string,
	opts: BlastOptions = {},
): Promise<BlastRadiusReport> {
	const result = await walk(store, root, {
		direction: "in",
		kinds: opts.kinds ?? IMPLICATION,
		maxDepth: opts.maxDepth ?? 3,
		limit: opts.limit ?? 100,
		fanout: opts.fanout ?? 500,
	});
	const impacted: ImpactedNode[] = [];
	let unresolved = 0;
	for (const hit of result.hits) {
		// Invariant 7: an edge may name an id nobody has put. Counted, not faked —
		// a row with a made-up node would claim a file that may not exist.
		if (!hit.node) {
			unresolved++;
			continue;
		}
		impacted.push(row(hit, hit.node));
	}
	impacted.sort(rank);
	return {
		root,
		impacted,
		truncated: result.truncation.truncated,
		truncation: result.truncation,
		unresolved,
	};
}

function row(hit: WalkHit, node: NonNullable<WalkHit["node"]>): ImpactedNode {
	const last = hit.path[hit.path.length - 1];
	return {
		node,
		depth: hit.depth,
		// A hit always has at least one hop, so `last` is only optional to the
		// type checker; "defines" is a placeholder no walked row can reach.
		via: last?.kind ?? "defines",
		path: hit.path,
		score: strength(hit.path) / Math.max(hit.depth, 1),
	};
}

/** Weakest link. A path through a file referenced once is a thin implication
 * however heavily the next hop is used. */
function strength(path: GraphEdge[]): number {
	let min = Number.POSITIVE_INFINITY;
	for (const e of path) min = Math.min(min, e.weight ?? 1);
	return Number.isFinite(min) ? min : 1;
}

function rank(a: ImpactedNode, b: ImpactedNode): number {
	return a.depth - b.depth || b.score - a.score || cmp(a.node.id, b.node.id);
}
