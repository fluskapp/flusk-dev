/**
 * The shapes the four graph queries answer with. They exist beside the frozen
 * contract, never inside it: types.ts is compiled against by the builders and
 * the store adapter, so a query-only field must not land there.
 *
 * Every row type here carries its OWN EVIDENCE, and that is the whole point.
 * A ranked list a reader cannot audit is a list they cannot trust: they have to
 * take "b.ts is in your blast radius" on faith, and one wrong edge then poisons
 * every answer built on it. So a row never states a relationship without the
 * triples that produced it — `path` for a walked row, `edge` for a one-hop row,
 * `evidence` for a score. Nothing here is inferred beyond what the edges say.
 *
 * Each report extends its frozen counterpart rather than replacing it: the
 * added fields are extra, so a consumer typed against BlastRadius/CoChange/
 * Provenance keeps compiling and simply ignores the audit trail.
 *
 * TRUNCATION IS PART OF THE ANSWER. A capped query that returns a bare prefix
 * lies by omission — the reader reads "3 impacted files" as "only 3". Every
 * report therefore says whether a cap bit, and which one.
 */
import type { BlastRadius, CoChange, EdgeKind, GraphEdge, GraphNode, Provenance } from "./types.js";

/** Why an answer is a floor rather than a complete set. */
export type TruncationReason =
	/** The depth bound stopped a walk that still had somewhere to go. */
	| "depth"
	/** The result cap was reached; more rows qualified. */
	| "limit"
	/** One node's edge list filled the per-node read cap. */
	| "fanout"
	/** A store read failed; queries degrade instead of throwing (invariant 12). */
	| "store_error"
	/**
	 * The BUILDER capped what it derived for a node on the answer, so edges that
	 * qualify are absent from the store entirely. No query cap can detect this —
	 * the rows were never written — so the node carries `capped` and the walk
	 * reports it, otherwise a short answer would be stamped complete.
	 */
	| "source";

export interface Truncation {
	truncated: boolean;
	/** Sorted and deduped, so two identical answers compare equal. */
	reasons: TruncationReason[];
	/** Qualifying rows known to have been dropped. A FLOOR: once a cap bites the
	 * query stops looking, so the true remainder can only be larger. */
	dropped: number;
}

/** One implicated node, with the exact hops that implicate it. */
export interface ImpactedNode {
	node: GraphNode;
	/** Edges walked from the root. Always equals `path.length`. */
	depth: number;
	/** Kind of the LAST hop — the frozen field; `path` carries the rest. */
	via: EdgeKind;
	/** Root → node, one edge per hop, in walk order: the audit trail. */
	path: GraphEdge[];
	/** Weakest hop on the path divided by depth. Strength, never confidence. */
	score: number;
}

export interface BlastRadiusReport extends BlastRadius {
	impacted: ImpactedNode[];
	truncation: Truncation;
	/** Edges whose far end no builder has put yet, so no row could be made for
	 * them (invariant 7). Counted, never invented. */
	unresolved: number;
}

/** One file that historically moves with the root, and the commits proving it. */
export interface CoChangePeer {
	node: GraphNode;
	/** The `changed_with` weight: how many commits the BUILDER counted. */
	commits: number;
	/** Commits this query re-confirmed from `touched_by` edges on both ends. May
	 * be lower than `commits` when the store holds less history than the builder
	 * saw — a gap to read, not a bug to hide. */
	confirmed: number;
	/** Up to `evidence` of those commits, as nodes. Capped list, honest count:
	 * `confirmed` states the total the cap hid. */
	evidence: GraphNode[];
	/** Share of the root's own commits this peer rode along in: commits ÷ the
	 * root's commit count, or 0 when the root has no `touched_by` edges. */
	score: number;
	/** The single triple this row asserts. */
	edge: GraphEdge;
}

export interface CoChangeReport extends CoChange {
	peers: CoChangePeer[];
	/** Denominator of `score`, so the ratio can be checked by hand. */
	commitsTouchingRoot: number;
	truncation: Truncation;
}

/** How a commit, run or doc came to be attached to the target. */
export type ProvenanceRelation = "touched_by" | "documents";

export interface ProvenanceRow {
	node: GraphNode;
	relation: ProvenanceRelation;
	/** The triple that produced this row. */
	edge: GraphEdge;
	/** From the HistoryCard join, never from the graph (invariant 13). Null when
	 * no card matched, which is why `ordered` exists. */
	at: string | null;
	/** The card ref that supplied `at`: a full sha, a journal path. */
	ref: string | null;
}

export interface ProvenanceReport extends Provenance {
	/** Every row, newest first, across all three buckets. */
	rows: ProvenanceRow[];
	/** "history" when a clock ordered these; "id" when none was supplied and the
	 * order is merely stable. Saying "newest first" without a clock would lie. */
	ordered: "history" | "id";
	truncation: Truncation;
	unresolved: number;
}

/** A node in the local subgraph, plus why it is on the canvas. */
export interface NeighbourNode {
	node: GraphNode;
	depth: number;
	via: EdgeKind;
	path: GraphEdge[];
	/** Edges incident to it WITHIN the returned subgraph — the drawing's degree,
	 * not the node's true degree in the graph. */
	degree: number;
	score: number;
}

/** The drawable answer: nodes the caller can lay out, edges it can connect. */
export interface Neighbourhood {
	root: string;
	/** Null when nothing has put the root node itself (invariant 7). */
	center: GraphNode | null;
	nodes: NeighbourNode[];
	/** Only edges with BOTH ends in `nodes`, so a renderer never needs a node it
	 * was not given. */
	edges: GraphEdge[];
	/** Edges seen but dropped because an end fell outside the node cap. */
	edgesDropped: number;
	truncation: Truncation;
	unresolved: number;
}
