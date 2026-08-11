/**
 * The one bounded breadth-first traversal the graph queries are built from.
 * Without it, blast radius and neighbourhood would each re-implement BFS, and
 * the three things easy to get wrong — the depth bound, the result cap, and
 * admitting that either bit — would drift apart between them.
 *
 * THE PROBE RING is why the loop runs to `maxDepth + 1`. Reaching a node at the
 * depth bound does not mean anything lies beyond it, so the walk reads one ring
 * further, records nothing from it, and stops at the first unvisited id.
 * Guessing instead would either cry truncation on a complete answer or hide a
 * real one, and a truncation flag nobody can trust is worse than none.
 *
 * A node keeps the FIRST path that reached it, which is a shortest one, and is
 * deterministic because safe-read sorts every batch. Callers rank afterwards;
 * ranking here would bake one query's idea of strength into all of them.
 */
import type { Truncation } from "./query-types.js";
import { edgeKey, far, type ReadOptions, readNeighbors, readNode } from "./safe-read.js";
import { type Tracker, tracker } from "./truncation.js";
import type { GraphEdge, GraphNode, GraphStore } from "./types.js";

export interface WalkOptions extends ReadOptions {
	/** Edges walked, not nodes visited. */
	maxDepth: number;
	/** Max recorded hits. */
	limit: number;
}

export interface WalkHit {
	id: string;
	/** Null when no builder has put that id (invariant 7). Callers count these;
	 * the walk refuses to invent a node so a query cannot claim one exists. */
	node: GraphNode | null;
	depth: number;
	/** Root → hit, one edge per hop, in walk order: the row's audit trail. */
	path: GraphEdge[];
}

export interface WalkResult {
	hits: WalkHit[];
	/** Every triple the walk read, deduped: the drawable edge set. */
	edges: GraphEdge[];
	truncation: Truncation;
}

interface Step {
	id: string;
	path: GraphEdge[];
}

export async function walk(
	store: GraphStore,
	root: string,
	opts: WalkOptions,
): Promise<WalkResult> {
	const t = tracker();
	const hits: WalkHit[] = [];
	const edges = new Map<string, GraphEdge>();
	const seen = new Set<string>([root]);
	// The cap having BITTEN, not the count having reached it. Landing exactly on
	// `limit` drops nothing, so nothing set the flag — skipping the probe there
	// would report a depth-bounded answer as complete, which is the one thing
	// this walk exists to prevent.
	let capped = false;
	// A node whose edges the BUILDER capped makes everything reached through it a
	// floor, and no query cap can notice: those triples were never written. The
	// root is read for this alone — it is the node whose references get capped.
	if ((await readNode(store, root, t))?.capped === true) t.hit("source");
	let frontier: Step[] = [{ id: root, path: [] }];
	for (let depth = 1; depth <= opts.maxDepth + 1 && frontier.length > 0; depth++) {
		const probing = depth > opts.maxDepth;
		// The probe only decides the truncated flag, which the cap has already set.
		if (probing && capped) break;
		const next: Step[] = [];
		for (const cur of frontier) {
			for (const n of await readNeighbors(store, cur.id, opts, t)) {
				edges.set(edgeKey(n.edge), n.edge);
				const id = far(n.edge, cur.id);
				if (n.node?.capped === true) t.hit("source");
				if (seen.has(id)) continue;
				seen.add(id);
				if (probing) return finish(hits, edges, t, true);
				if (hits.length >= opts.limit) {
					capped = true;
					t.hit("limit");
					t.drop(1);
					continue;
				}
				const path = [...cur.path, n.edge];
				hits.push({ id, node: n.node, depth, path });
				next.push({ id, path });
			}
		}
		frontier = next;
	}
	return finish(hits, edges, t, false);
}

function finish(
	hits: WalkHit[],
	edges: Map<string, GraphEdge>,
	t: Tracker,
	beyondDepth: boolean,
): WalkResult {
	if (beyondDepth) t.hit("depth");
	return { hits, edges: [...edges.values()], truncation: t.done() };
}
