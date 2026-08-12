/**
 * The one payload the Graph tool window reads, and the caps that bound it.
 *
 * It exists as its own file because the shape is a CONTRACT between the route
 * and the client string in client-graph.ts, which TypeScript cannot check: the
 * client is plain JS in a template literal, so the only way a field rename
 * stays honest is for both sides to be written against a named type and for
 * test/api-graph.test.ts to assert the field is really on the wire.
 *
 * `state` is the reason the panel never renders an empty box. An unbuilt graph
 * and a graph that simply has nothing to say about this file are DIFFERENT
 * answers with different remedies, so the server decides which one it is —
 * the client cannot tell them apart from a pile of empty arrays.
 */
import type {
	BlastRadiusReport,
	CoChangeReport,
	Neighbourhood,
	ProvenanceReport,
} from "./queries.js";
import type { GraphNode } from "./types.js";

/**
 * `unindexed` — nothing has been written for this project at all.
 * `unknown`   — the graph exists but holds no node for what was asked about.
 * `ok`        — the four answers below are real, even when they are empty.
 */
export type GraphState = "ok" | "unindexed" | "unknown";

/** Panel caps. Smaller than the query defaults on purpose: this is a reading
 * surface, not an export, and 100 blast rows is a page nobody finishes. The
 * neighbourhood cap is deliberately above what the diagram will draw, so the
 * client can SAY how many it is not drawing instead of silently cutting. */
export const GRAPH_LIMITS = {
	blast: 40,
	blastDepth: 3,
	cochange: 12,
	provenance: 30,
	local: 24,
	radius: 1,
} as const;

export interface GraphReply {
	state: GraphState;
	/** FindRoot.project — the root's basename, the same handle everywhere else. */
	project: string;
	/** The project root, because the panel's remedy is a POST that names it.
	 * Only ever a root the config already lists; the build route re-checks it
	 * by exact membership rather than trusting this value back. */
	root: string;
	/** What was asked about, present whatever the state, so the panel can name
	 * the thing it has nothing to say about. */
	asked: { file: string; symbol: string | null; id: string };
	/** The node itself; null unless `state` is "ok". */
	target: GraphNode | null;
	/** The whole graph's size — the honest denominator for "nothing found". */
	stats: { nodes: number; edges: number };
	/** Why the state is not "ok". Never absent when it is not (invariant: an
	 * empty answer carries its reason, the same rule /api/doc keeps). */
	note?: string;
	/** What to DO about it, in one sentence. A note with no remedy is a dead end. */
	action?: string;
	blast: BlastRadiusReport | null;
	cochange: CoChangeReport | null;
	provenance: ProvenanceReport | null;
	/** The drawable local subgraph. Named `local` because `neighbourhood` is the
	 * query, and the field is its result rather than the function. */
	local: Neighbourhood | null;
}
