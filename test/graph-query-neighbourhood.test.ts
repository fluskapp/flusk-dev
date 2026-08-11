/**
 * The drawable subgraph. Two properties matter more than the exact contents:
 * the edge set is CLOSED (a renderer never gets an edge to a node it was not
 * given), and it is COMPLETE for the nodes drawn — including edges between two
 * neighbours that the walk itself never traversed, which is what the closure
 * re-read exists for and what a walk-only implementation silently loses.
 *
 * The expected order below is derived by hand from the fixture's degrees, so a
 * ranking that quietly follows the store's ordering fails here.
 */
import { describe, expect, it } from "vitest";
import { neighbourhood } from "../src/graph/queries.js";
import { commit, doc, edge, fakeStore, file, run, sym } from "./graph-query-fixture.js";
import { A, CORE, edges, nodes } from "./graph-query-graph.js";

const store = fakeStore(nodes, edges);
const README = doc("README.md");

describe("neighbourhood", () => {
	it("ranks by depth, then degree inside the drawing, then id", async () => {
		const r = await neighbourhood(store, A, { radius: 1 });
		expect(r.center?.id).toBe(A);
		expect(r.nodes.map((n) => n.node.id)).toEqual([
			file("b.ts"),
			file("c.ts"),
			file("d.ts"),
			commit(1),
			commit(2),
			commit(3),
			CORE,
			commit(4),
			commit(5),
			commit(6),
			commit(7),
			commit(8),
			README,
			run("r1"),
			run("r2"),
		]);
		expect(r.nodes.map((n) => n.degree).slice(0, 3)).toEqual([11, 6, 5]);
		expect(r.nodes.every((n) => n.score === n.degree / n.depth)).toBe(true);
	});

	it("returns a closed edge set, and counts what closing it cost", async () => {
		const r = await neighbourhood(store, A, { radius: 1 });
		const inside = new Set([A, ...r.nodes.map((n) => n.node.id)]);
		for (const e of r.edges) {
			expect(inside.has(e.from) && inside.has(e.to)).toBe(true);
		}
		expect(r.edges).toHaveLength(33);
		// f.ts imports c.ts and e.ts imports d.ts both leave the drawing.
		expect(r.edgesDropped).toBe(2);
	});

	it("includes edges between two neighbours the walk never traversed", async () => {
		const r = await neighbourhood(store, A, { radius: 1 });
		// d.ts is discovered from a.ts and never expanded, yet its commits are
		// drawn nodes, so the edge between them belongs in the picture.
		expect(r.edges).toContainEqual(edge(file("d.ts"), "touched_by", commit(1)));
		expect(r.edges).toContainEqual(edge(file("b.ts"), "references", CORE, 5));
	});

	it("carries the path that reached every drawn node", async () => {
		const r = await neighbourhood(store, A, { radius: 1 });
		for (const n of r.nodes) {
			expect(n.path).toHaveLength(n.depth);
			expect(n.path[0]?.from === A || n.path[0]?.to === A).toBe(true);
			const last = n.path[n.path.length - 1];
			expect(last?.kind).toBe(n.via);
			expect(last?.from === n.node.id || last?.to === n.node.id).toBe(true);
		}
	});

	it("reports the node cap and stays deterministic under it", async () => {
		// Candidates are capped at 3x the node cap, so 12 of a.ts's 15 neighbours
		// are walked (3 dropped there) and 8 more lose the ranking: 11 in total,
		// and every one of them is counted rather than silently omitted.
		// b/c/d lead selection on walk-observed degree (a symmetric changed_with
		// pair each); the drawn order then follows degree INSIDE the picture,
		// where commit 1 joins all four files.
		const r = await neighbourhood(store, A, { radius: 1, limit: 4 });
		expect(r.nodes.map((n) => n.node.id)).toEqual([
			commit(1),
			file("b.ts"),
			file("d.ts"),
			file("c.ts"),
		]);
		expect(r.nodes.map((n) => n.degree)).toEqual([4, 4, 4, 3]);
		expect(r.truncation.truncated).toBe(true);
		expect(r.truncation.reasons).toContain("limit");
		expect(r.truncation.dropped).toBe(11);
		expect(r.edgesDropped).toBeGreaterThan(0);
		const again = await neighbourhood(fakeStore(nodes, [...edges].reverse()), A, {
			radius: 1,
			limit: 4,
		});
		expect(again.nodes.map((n) => n.node.id)).toEqual(r.nodes.map((n) => n.node.id));
	});

	it("says when the radius, not the graph, ended the picture", async () => {
		const bounded = await neighbourhood(store, A, { radius: 1 });
		expect(bounded.truncation.reasons).toContain("depth");
		const whole = await neighbourhood(store, A, { radius: 5 });
		expect(whole.truncation).toEqual({ truncated: false, reasons: [], dropped: 0 });
		expect(whole.nodes).toHaveLength(nodes.length - 1);
	});

	it("counts dangling ends and degrades when the store throws", async () => {
		const ghost = fakeStore(nodes, [...edges, edge(A, "touched_by", run("missing"))]);
		expect((await neighbourhood(ghost, A, { radius: 1 })).unresolved).toBe(1);
		const broken = await neighbourhood(fakeStore(nodes, edges, [A]), A);
		expect(broken.nodes).toEqual([]);
		expect(broken.center).toBe(null);
		expect(broken.truncation.reasons).toEqual(["store_error"]);
	});

	it("answers about a node nobody has put without inventing one", async () => {
		const r = await neighbourhood(store, sym("a.ts", "absent"));
		expect(r).toMatchObject({ center: null, nodes: [], edges: [], edgesDropped: 0 });
	});
});
