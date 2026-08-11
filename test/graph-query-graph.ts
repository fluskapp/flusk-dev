/**
 * One synthetic graph with a shape known by hand, so every expected ranking in
 * the query tests can be derived on paper rather than read off the code under
 * test. A fixture whose answers come from running the implementation cannot
 * catch the implementation being wrong.
 *
 * THE SHAPE (project "syn"):
 *   a.ts defines core; b.ts references core (5); c.ts references core (1)
 *   d.ts imports b.ts; f.ts imports c.ts; e.ts imports d.ts
 *     → inbound from core: b,a,c at depth 1, d,f at 2, e at 3.
 *   a.ts changed_with b.ts (7), c.ts (7), d.ts (2), each written both ways.
 *   touched_by: a.ts → commits 1..8 + runs r1,r2; b.ts → 1..7; c.ts → 1..3;
 *   d.ts → 1..2  → shared with a.ts: b 7, c 3, d 2. The b/c tie on weight is
 *   deliberate: it is broken by confirmed evidence, not by insertion order.
 *   README.md (doc) documents a.ts.
 * Dates: commit n at 2026-01-0n, r1 at 2026-02-01, README at 2026-03-01, and
 * r2 has NO card, so provenance has to place an undated row.
 */

import type { GraphEdge, GraphNode } from "../src/graph/types.js";
import type { HistoryCard } from "../src/history/types.js";
import { coEdges, commit, doc, edge, file, node, P, run, sha, sym } from "./graph-query-fixture.js";

export const CORE = sym("a.ts", "core");
export const A = file("a.ts");
const FILES = ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"];
const COMMITS = [1, 2, 3, 4, 5, 6, 7, 8];

export const nodes: GraphNode[] = [
	...FILES.map((rel) => node(file(rel), "file", rel)),
	node(CORE, "symbol", "core"),
	...COMMITS.map((n) => node(commit(n), "commit", `commit ${n}`)),
	node(run("r1"), "run", "run r1"),
	node(run("r2"), "run", "run r2"),
	node(doc("README.md"), "doc", "README.md"),
];

const touched = (rel: string, upto: number): GraphEdge[] =>
	COMMITS.filter((n) => n <= upto).map((n) => edge(file(rel), "touched_by", commit(n)));

export const edges: GraphEdge[] = [
	edge(A, "defines", CORE),
	edge(file("b.ts"), "references", CORE, 5),
	edge(file("c.ts"), "references", CORE, 1),
	edge(file("d.ts"), "imports", file("b.ts")),
	edge(file("f.ts"), "imports", file("c.ts")),
	edge(file("e.ts"), "imports", file("d.ts")),
	...coEdges(A, file("b.ts"), 7),
	...coEdges(A, file("c.ts"), 7),
	...coEdges(A, file("d.ts"), 2),
	...touched("a.ts", 8),
	...touched("b.ts", 7),
	...touched("c.ts", 3),
	...touched("d.ts", 2),
	edge(A, "touched_by", run("r1")),
	edge(A, "touched_by", run("r2")),
	edge(doc("README.md"), "documents", A),
];

const card = (over: Partial<HistoryCard> & Pick<HistoryCard, "id" | "kind" | "at" | "ref">) => ({
	project: P,
	title: over.id,
	text: "",
	paths: [],
	outcome: "shipped" as const,
	...over,
});

/** Joined by `ref` (full sha, journal path), never by card id (invariant 4). */
export const cards: HistoryCard[] = [
	...COMMITS.map((n) =>
		card({
			id: `commit:${P}:${sha(n).slice(0, 8)}`,
			kind: "commit",
			at: `2026-01-0${n}T00:00:00.000Z`,
			ref: sha(n),
		}),
	),
	card({ id: "journal:r1", kind: "journal", at: "2026-02-01T00:00:00.000Z", ref: "/h/runs/r1.md" }),
	card({ id: "doc:readme", kind: "doc", at: "2026-03-01T00:00:00.000Z", ref: "README.md" }),
];
