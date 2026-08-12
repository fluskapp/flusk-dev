/**
 * The GraphStore over append-only JSONL, one file per project in the flusk home.
 *
 * This is THE adapter — the whole point of keeping types.ts free of any
 * mention of a store, table or file format is that swapping JSONL for the
 * local triple store replaces this file and nothing else. The on-disk row is
 * already a triple, so that swap is a transport change, not a modelling one.
 *
 * Two things beyond the port, deliberately, because both are properties of
 * this storage and not of the model:
 *  - `forgetOut`/`forgetIn`, because re-indexing a changed file must retract
 *    the edges it used to have and an append-only log has no retraction;
 *  - compaction, because a log that is appended to on every build outgrows the
 *    graph it encodes. Both take effect on the next `flush`.
 *
 * Nothing throws (invariant 12): reads answer null/[], writes answer a
 * GraphWriteResult carrying the failure.
 */

import { appendTriples, graphPath, readTriples, rewriteTriples } from "./store-io.js";
import {
	allTriples,
	applyTriple,
	dropEdges,
	edgesOf,
	type GraphMemory,
	replay,
} from "./store-state.js";
import { edgeTriple, nodeTriples, type Triple, toNode } from "./triples.js";
import type {
	EdgeKind,
	GraphEdge,
	GraphNode,
	GraphStore,
	GraphWriteResult,
	Neighbor,
	NeighborOptions,
} from "./types.js";

/** Rewrite once the log is this many times larger than the graph it encodes. */
const COMPACT_RATIO = 3;
const COMPACT_FLOOR = 2000;

export interface JsonlGraph extends GraphStore {
	path: string;
	/** Retract `kinds` leaving `from`; re-indexing a file starts here. */
	forgetOut(from: string, kinds: EdgeKind[]): void;
	/** Retract `kinds` arriving at `to` — the stale references to a symbol. */
	forgetIn(to: string, kinds: EdgeKind[]): void;
	/** Applies pending retractions/compaction. `put` does it implicitly. */
	flush(): GraphWriteResult;
	stats(): { nodes: number; edges: number; lines: number };
}

export function openGraphStore(root: string): JsonlGraph {
	return openGraphAt(graphPath(root));
}

/** Opens a graph file directly — the seam the tests and a future migration use. */
export function openGraphAt(path: string): JsonlGraph {
	const log = readTriples(path);
	const mem: GraphMemory = replay(log);
	let lines = log.length;
	let rewriteNeeded = false;

	const live = (): number => mem.facts.size * 2 + mem.edges;
	const write = (fresh: Triple[]): GraphWriteResult => {
		try {
			if (rewriteNeeded || lines + fresh.length > COMPACT_FLOOR + COMPACT_RATIO * live()) {
				const all = allTriples(mem);
				rewriteTriples(path, all);
				lines = all.length;
				rewriteNeeded = false;
			} else if (fresh.length > 0) {
				appendTriples(path, fresh);
				lines += fresh.length;
			}
			return { ok: true, nodes: mem.facts.size, edges: mem.edges };
		} catch (err) {
			return { ok: false, reason: err instanceof Error ? err.message : String(err) };
		}
	};

	return {
		path,
		async put(nodes: GraphNode[], edges: GraphEdge[]): Promise<GraphWriteResult> {
			const fresh: Triple[] = [];
			for (const node of nodes) fresh.push(...nodeTriples(node));
			for (const edge of edges) fresh.push(edgeTriple(edge));
			// Memory first: a failed write must still leave this process's view
			// consistent with what the next flush will persist.
			for (const t of fresh) applyTriple(mem, t);
			return write(fresh);
		},
		async node(id: string): Promise<GraphNode | null> {
			const facts = mem.facts.get(id);
			return facts === undefined ? null : toNode(id, facts);
		},
		async neighbors(id: string, opts: NeighborOptions = {}): Promise<Neighbor[]> {
			const wanted = opts.kinds !== undefined && opts.kinds.length > 0 ? new Set(opts.kinds) : null;
			const dirs: Array<"out" | "in"> =
				opts.direction === "both" ? ["out", "in"] : [opts.direction ?? "out"];
			const out: Neighbor[] = [];
			const limit = opts.limit ?? Number.POSITIVE_INFINITY;
			for (const dir of dirs) {
				for (const edge of edgesOf(mem, id, dir)) {
					if (wanted !== null && !wanted.has(edge.kind)) continue;
					if (out.length >= limit) return out;
					const far = dir === "out" ? edge.to : edge.from;
					const facts = mem.facts.get(far);
					out.push({ edge, node: facts === undefined ? null : toNode(far, facts) });
				}
			}
			return out;
		},
		forgetOut(from, kinds) {
			dropEdges(mem, from, kinds, "out");
			rewriteNeeded = true;
		},
		forgetIn(to, kinds) {
			dropEdges(mem, to, kinds, "in");
			rewriteNeeded = true;
		},
		flush: () => write([]),
		stats: () => ({ nodes: mem.facts.size, edges: mem.edges, lines }),
	};
}
