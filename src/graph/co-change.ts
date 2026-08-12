/**
 * "What has historically moved with this file?" — the question no static
 * analysis answers, because the coupling it finds was never written down: a
 * schema and its migration, a component and its snapshot, a flag and the doc
 * that explains it.
 *
 * The `changed_with` weight is the builder's count, and this query does NOT
 * take it on trust. It re-derives the shared commits from the `touched_by`
 * edges on BOTH ends and reports them as `evidence`, so a peer is never merely
 * asserted to co-change: the commits are named and can be opened. When
 * `confirmed` is below `commits`, the store simply holds less history than the
 * builder saw — that gap is shown rather than papered over, and the row is
 * never inflated to match the weight.
 *
 * RANKING: `commits` descending (the builder's count), then `confirmed`
 * descending so the better-evidenced of two equal weights wins, then node id
 * ascending for a total, stable order. `score` is the peer's share of the
 * root's own history — 7 of the root's 12 commits — which is what makes a
 * weight comparable between a file touched constantly and one touched twice.
 * It is strength, never confidence (invariant 10); above 1.0 it means the
 * store has fewer `touched_by` edges than the builder counted.
 */
import type { CoChangePeer, CoChangeReport } from "./query-types.js";
import { type ReadOptions, readNeighbors } from "./safe-read.js";
import { cmp, type Tracker, tracker } from "./truncation.js";
import type { GraphNode, GraphStore, Neighbor } from "./types.js";

export interface CoChangeOptions {
	/** Max peers. Default 20. */
	limit?: number;
	/** Max commits listed per peer; `confirmed` still states the true count.
	 * Default 5. */
	evidence?: number;
	/** Max edges read per node. Default 500. */
	fanout?: number;
}

export async function coChange(
	store: GraphStore,
	root: string,
	opts: CoChangeOptions = {},
): Promise<CoChangeReport> {
	const t = tracker();
	const fanout = opts.fanout ?? 500;
	const limit = opts.limit ?? 20;
	const rootCommits = await commitsOf(store, root, fanout, t);
	const candidates = (
		await readNeighbors(store, root, { direction: "out", kinds: ["changed_with"], fanout }, t)
	)
		.filter((n): n is Neighbor & { node: GraphNode } => n.node !== null)
		.sort((a, b) => (b.edge.weight ?? 0) - (a.edge.weight ?? 0) || cmp(a.edge.to, b.edge.to));
	if (candidates.length > limit) {
		t.hit("limit");
		t.drop(candidates.length - limit);
	}
	const peers: CoChangePeer[] = [];
	for (const cand of candidates.slice(0, limit)) {
		peers.push(await peer(store, cand, rootCommits, opts.evidence ?? 5, fanout, t));
	}
	peers.sort(
		(a, b) => b.commits - a.commits || b.confirmed - a.confirmed || cmp(a.node.id, b.node.id),
	);
	return {
		root,
		peers,
		commitsTouchingRoot: rootCommits.size,
		truncation: t.done(),
	};
}

async function peer(
	store: GraphStore,
	cand: Neighbor & { node: GraphNode },
	rootCommits: Map<string, GraphNode>,
	cap: number,
	fanout: number,
	t: Tracker,
): Promise<CoChangePeer> {
	const shared = [...(await commitsOf(store, cand.node.id, fanout, t)).keys()]
		.filter((id) => rootCommits.has(id))
		.sort(cmp);
	const evidence: GraphNode[] = [];
	for (const id of shared.slice(0, cap)) {
		const node = rootCommits.get(id);
		if (node) evidence.push(node);
	}
	const commits = cand.edge.weight ?? 0;
	return {
		node: cand.node,
		commits,
		confirmed: shared.length,
		evidence,
		score: rootCommits.size === 0 ? 0 : commits / rootCommits.size,
		edge: cand.edge,
	};
}

/** Commits that touched a node, by id. Runs share the `touched_by` predicate,
 * so the kind is read off the NODE — ids are opaque and must not be parsed. */
async function commitsOf(
	store: GraphStore,
	id: string,
	fanout: number,
	t: Tracker,
): Promise<Map<string, GraphNode>> {
	const out = new Map<string, GraphNode>();
	const opts: ReadOptions = { direction: "out", kinds: ["touched_by"], fanout };
	for (const n of await readNeighbors(store, id, opts, t)) {
		if (n.node?.kind === "commit") out.set(n.node.id, n.node);
	}
	return out;
}
