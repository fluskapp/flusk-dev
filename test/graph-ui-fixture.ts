/**
 * A throwaway workspace for the Graph tool window's route: two projects, one
 * with a graph and one deliberately without, so "no graph yet" is a case the
 * tests can actually reach.
 *
 * The graph is seeded through the REAL JSONL adapter rather than by writing
 * lines by hand. That is the point: it proves the route reads what a build
 * writes, and a change to the on-disk encoding fails here instead of silently
 * making the panel answer about an empty graph.
 *
 * The shape below is hand-derivable, which is what lets the expectations be
 * written out rather than computed by the same code under test:
 *
 *   d.ts -imports-> a.ts -imports-> b.ts        (blast: a at 1, d at 2)
 *   b.ts -defines-> greet ; a.ts -references-> greet
 *   b.ts -touched_by-> commit ; c.ts -touched_by-> commit
 *   b.ts <-changed_with-> c.ts  (weight 3, one commit confirms it)
 *   notes.md -documents-> b.ts
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { graphPath } from "../src/graph/store-io.js";
import { openGraphAt } from "../src/graph/store-jsonl.js";
import type { GraphEdge, GraphNode } from "../src/graph/types.js";
import { put } from "./find-fixture.js";

/** A FULL 40-hex sha: ids.ts refuses an abbreviated one, and so should this. */
export const SHA = "1f".repeat(20);

export interface GraphTree {
	home: string;
	work: string;
	/** The project holding the seeded graph. */
	alpha: string;
	/** A configured project with no graph file at all. */
	beta: string;
	files: { a: string; b: string; c: string; d: string; notes: string; lonely: string };
	cleanup: () => void;
}

export function graphTree(): GraphTree {
	const home = mkdtempSync(join(tmpdir(), "flusk-graph-home-"));
	const work = mkdtempSync(join(tmpdir(), "flusk-graph-work-"));
	process.env.FLUSK_HOME = home;
	const alpha = join(work, "alpha");
	const beta = join(work, "beta");
	const files = {
		a: put(alpha, "src/a.ts", "import './b.js';\nexport const a = 1;\n"),
		b: put(alpha, "src/b.ts", "export function greet() { return 'hi'; }\n"),
		c: put(alpha, "src/c.ts", "export const c = 3;\n"),
		d: put(alpha, "src/d.ts", "import './a.js';\n"),
		notes: put(alpha, "docs/notes.md", "# Notes\n\nabout b\n"),
		// Indexed, on disk, and deliberately absent from the graph.
		lonely: put(alpha, "src/lonely.ts", "export const lonely = 0;\n"),
	};
	put(beta, "lib/x.ts", "export const x = 1;\n");
	writeFileSync(
		join(home, "config.json"),
		JSON.stringify({ ui: { harnessDirs: [], projectDirs: [join(work, "*")] } }),
	);
	return {
		home,
		work,
		alpha,
		beta,
		files,
		cleanup: () => {
			delete process.env.FLUSK_HOME;
			for (const dir of [home, work]) rmSync(dir, { recursive: true, force: true });
		},
	};
}

const id = {
	a: "file:alpha/src/a.ts",
	b: "file:alpha/src/b.ts",
	c: "file:alpha/src/c.ts",
	d: "file:alpha/src/d.ts",
	greet: "symbol:alpha/src/b.ts#greet",
	commit: `commit:alpha:${SHA}`,
	doc: "doc:alpha/docs/notes.md",
	/** An edge end nothing has put: invariant 7's dangling case, on purpose. */
	ghost: "file:alpha/src/gone.ts",
};

export const IDS = id;

/** Writes the graph described in this file's header, through the adapter. */
export async function seedGraph(tree: GraphTree): Promise<void> {
	const f = (nid: string, path: string): GraphNode => ({
		id: nid,
		kind: "file",
		label: path.slice(path.lastIndexOf("/") + 1),
		file: join(tree.alpha, path),
	});
	const nodes: GraphNode[] = [
		f(id.a, "src/a.ts"),
		f(id.b, "src/b.ts"),
		f(id.c, "src/c.ts"),
		f(id.d, "src/d.ts"),
		{ id: id.greet, kind: "symbol", label: "greet", file: join(tree.alpha, "src/b.ts"), line: 1 },
		{ id: id.commit, kind: "commit", label: "fix the greeting" },
		{ id: id.doc, kind: "doc", label: "notes.md", file: join(tree.alpha, "docs/notes.md") },
	];
	const edges: GraphEdge[] = [
		{ from: id.a, kind: "imports", to: id.b },
		{ from: id.d, kind: "imports", to: id.a },
		{ from: id.b, kind: "defines", to: id.greet },
		{ from: id.a, kind: "references", to: id.greet, weight: 2 },
		{ from: id.b, kind: "touched_by", to: id.commit },
		{ from: id.c, kind: "touched_by", to: id.commit },
		{ from: id.b, kind: "changed_with", to: id.c, weight: 3 },
		{ from: id.c, kind: "changed_with", to: id.b, weight: 3 },
		{ from: id.doc, kind: "documents", to: id.b },
		// Dangles: the store invents nothing, so this must be COUNTED as
		// unresolved rather than turned into a node (invariant 7).
		{ from: id.ghost, kind: "imports", to: id.b },
	];
	const store = openGraphAt(graphPath(tree.alpha));
	await store.put(nodes, edges);
}
