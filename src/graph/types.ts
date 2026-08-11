/**
 * The code-graph contract. Frozen: builders, the store adapter and the
 * workbench queries all compile against this file.
 * THE CENTRAL DESIGN FACT: an edge `(from, kind, to)` IS a fact triple
 * `(subject, predicate, object)`. The repo is gaining a local triple store with
 * query/transact, so persisting this model must stay MECHANICAL:
 *   GraphEdge → { subject: edge.from, predicate: edge.kind, object: edge.to }
 *   GraphNode → facts on the subject `node.id`: kind, label, and file/line.
 * Nothing here may therefore name a store, table, connection, namespace or file
 * format, and no type may be a class or carry a method other than the port
 * itself — which is what makes a store swap ONE adapter file, not a rewrite.
 * The graph CONSUMES what exists and reimplements neither: doc/ts-provider.ts
 * yields symbols, definitions, references and outlines; history/types.ts yields
 * commits, sessions and journals. Only ids and relations live here, never text.
 * INVARIANTS, referenced by number below:
 *  1. An edge is a triple; this model names no store, schema or transport.
 *  2. Identity is the derived `id` alone; `label`/`file`/`line` are display.
 *  3. Ids come from ID DERIVATION alone: builders that never meet must emit
 *     byte-identical ids for the same thing.
 *  4. Ids hold repo-relative POSIX paths and full 40-hex shas; join HistoryCard
 *     by its `ref`, never by its `id`, which abbreviates a sha to 8 chars.
 *  5. No id contains a line, an mtime, or anything else an edit can move.
 *  6. `put` is idempotent per node id and per `(from, kind, to)`.
 *  7. Edges may dangle: the store invents nothing, it reports `node: null`.
 *  8. `changed_with` is symmetric and written as TWO triples, one each way.
 *  9. Direction is fixed by the EdgeKind table and every predicate there is
 *     multi-valued: functional would supersede, leaving one edge per (from,kind).
 * 10. `weight` is strength, never confidence; 11. blast radius walks INBOUND.
 * 12. Nothing throws: reads degrade to null/[], writes return GraphWriteResult.
 * 13. No timestamps here; ordering comes from the HistoryCard join.
 */

/** What a node stands for. Closed on purpose: a new kind is a new query. */
export type NodeKind = "file" | "symbol" | "commit" | "run" | "doc";

/**
 * ID DERIVATION — the load-bearing rule. An unstable id does not throw: it forks
 * the graph into two half-populated islands, and every query then quietly answers
 * about one of them.
 *   file    `file:<project>/<rel>`           doc   `doc:<project>/<rel>`
 *   symbol  `symbol:<project>/<rel>#<name>`  run   `run:<runId>`
 *   commit  `commit:<project>:<sha>`
 * <project> is FindRoot.project (src/find/files.ts), the root's basename, never a
 * path. <rel> is relative to that root: POSIX separators, no leading "./", NFC,
 * case exactly as on disk — an absolute path bakes in the machine's home
 * directory, and two clones of one repo then share no node at all. <sha> is the
 * full 40-char lowercase hex; <runId> is the harness run id, unqualified because
 * one run spans projects. <name> is SymbolDoc.name qualified by the file it is
 * DEFINED in (SymbolDoc.defined.file), never one it is referenced from, so
 * overloads collapse into one node by design; a name two declarations in that
 * file SHARE is qualified further by its container (symbol-names.ts) — one id for
 * two symbols is a silent merge, not a collision anything reports. The kind
 * prefix is part of the id, so one markdown path can be both a `file` and a
 * `doc` node, joined by a `documents` edge.
 */
export interface GraphNode {
	/** Derived by the rules above. Opaque downstream: compare, never parse. */
	id: string;
	kind: NodeKind;
	/** Humans only: a basename, a symbol name, a commit subject. */
	label: string;
	/** Absolute path, for opening it. Display, not identity (invariant 2). */
	file?: string;
	/** 1-based, as everywhere in src/doc/types.ts. Display, not identity. */
	line?: number;
	/** The BUILDER's cap bit while deriving this node's edges: its edge set is a
	 * floor. NOT display — the loss happened at build time, where no query cap can
	 * see it, so a walk meeting this must report the answer as incomplete. */
	capped?: boolean;
}

/**
 * The predicate set. Direction is FIXED per kind and stated once, here, because
 * a reversed edge stays type-correct and answers the opposite question:
 *   imports       file → file                   importer → imported
 *   defines       file → symbol
 *   references    file → symbol                 referencing file → referenced
 *   documents     doc  → file | symbol
 *   touched_by    file | symbol → commit | run  artifact → actor
 *   changed_with  file → file                   both ways (invariant 8)
 */
export type EdgeKind =
	| "imports" | "references" | "defines" | "changed_with" | "touched_by" | "documents";

/** `from`/`kind`/`to` are the triple's subject/predicate/object; both ends are
 * GraphNode ids, and an end may name a node nobody has put yet (invariant 7). */
export interface GraphEdge {
	from: string;
	kind: EdgeKind;
	to: string;
	/** Co-change count for `changed_with`, reference count for `references`, absent
	 * otherwise. NOT confidence: read as a belief score it would claim certainty
	 * about a pair that merely moves together often. */
	weight?: number;
}

export interface NeighborOptions {
	/** Default "out"; "in" is what blast radius needs. */
	direction?: "out" | "in" | "both";
	/** Absent or empty means every kind. */
	kinds?: EdgeKind[];
	limit?: number;
}

/** One step out: the triple, plus its far end when some builder has put it. */
export interface Neighbor {
	edge: GraphEdge;
	/** Null when no builder has put that id yet (invariant 7). */
	node: GraphNode | null;
}

/** Writes report failure rather than throwing it (invariant 12). */
export type GraphWriteResult =
	| { ok: true; nodes: number; edges: number }
	| { ok: false; reason: string };

/** The port, and the ONLY surface an adapter implements. The queries below are
 * traversals composed from these three calls and never further methods, which is
 * what keeps a store swap down to one file. */
export interface GraphStore {
	/** Idempotent upsert, keyed by `id` and by `(from, kind, to)` (invariant 6). */
	put(nodes: GraphNode[], edges: GraphEdge[]): Promise<GraphWriteResult>;
	node(id: string): Promise<GraphNode | null>;
	neighbors(id: string, opts?: NeighborOptions): Promise<Neighbor[]>;
}

/** "What breaks if I change this": INBOUND imports/references/defines. Walking
 * outbound answers "what does this depend on" and reads just as plausible. */
export interface BlastRadius {
	root: string;
	/** Nearest first; `depth` counts edges walked, `via` is the last one. */
	impacted: Array<{ node: GraphNode; depth: number; via: EdgeKind }>;
	/** Budget hit: the answer is a floor, never a complete set. */
	truncated: boolean;
}

/** "What has historically changed WITH this": `changed_with`, weight-ordered. */
export interface CoChange {
	root: string;
	peers: Array<{ node: GraphNode; commits: number }>;
}

/** "Which commits and runs touched this": outbound touched_by, inbound documents. */
export interface Provenance {
	target: string;
	commits: GraphNode[];
	runs: GraphNode[];
	docs: GraphNode[];
}
