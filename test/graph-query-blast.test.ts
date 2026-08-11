/**
 * Blast radius on a graph whose inbound closure is known by hand. The point of
 * every case here is that a wrong answer is INDISTINGUISHABLE from a right one
 * without them: a depth bound that walks one ring too far, a rank that flips
 * with the store's ordering, or a cap that returns a silent prefix all look
 * like a perfectly ordinary result list.
 */
import { describe, expect, it } from "vitest";
import { blastRadius } from "../src/graph/queries.js";
import { edge, fakeStore, file, sym } from "./graph-query-fixture.js";
import { CORE, edges, nodes } from "./graph-query-graph.js";

const store = fakeStore(nodes, edges);
const ids = (r: { impacted: Array<{ node: { id: string } }> }) => r.impacted.map((i) => i.node.id);

describe("blast radius", () => {
	it("respects the depth bound and says the answer is bounded", async () => {
		const one = await blastRadius(store, CORE, { maxDepth: 1 });
		expect(ids(one)).toEqual([file("b.ts"), file("a.ts"), file("c.ts")]);
		expect(one.impacted.every((i) => i.depth === 1)).toBe(true);
		expect(one.truncated).toBe(true);
		expect(one.truncation.reasons).toContain("depth");

		const two = await blastRadius(store, CORE, { maxDepth: 2 });
		expect(ids(two)).toEqual([
			file("b.ts"),
			file("a.ts"),
			file("c.ts"),
			file("d.ts"),
			file("f.ts"),
		]);
	});

	it("reports no truncation once the closure is exhausted", async () => {
		const all = await blastRadius(store, CORE, { maxDepth: 3 });
		expect(ids(all)).toEqual([
			file("b.ts"),
			file("a.ts"),
			file("c.ts"),
			file("d.ts"),
			file("f.ts"),
			file("e.ts"),
		]);
		expect(all.truncated).toBe(false);
		expect(all.truncation).toEqual({ truncated: false, reasons: [], dropped: 0 });
	});

	it("ranks by depth, then weakest hop, then id — whatever order the store answers in", async () => {
		const forward = await blastRadius(store, CORE, { maxDepth: 3 });
		const shuffled = await blastRadius(fakeStore(nodes, [...edges].reverse()), CORE, {
			maxDepth: 3,
		});
		expect(ids(shuffled)).toEqual(ids(forward));
		expect(forward.impacted.map((i) => i.score)).toEqual([5, 1, 1, 0.5, 0.5, 1 / 3]);
	});

	it("carries the edge path that put every row in the answer", async () => {
		const r = await blastRadius(store, CORE, { maxDepth: 3 });
		for (const row of r.impacted) {
			expect(row.path).toHaveLength(row.depth);
			expect(row.path[0]?.to === CORE || row.path[0]?.from === CORE).toBe(true);
			const last = row.path[row.path.length - 1];
			expect(last?.kind).toBe(row.via);
			expect(last?.from === row.node.id || last?.to === row.node.id).toBe(true);
		}
		const d = r.impacted.find((i) => i.node.id === file("d.ts"));
		expect(d?.path).toEqual([
			edge(file("b.ts"), "references", CORE, 5),
			edge(file("d.ts"), "imports", file("b.ts")),
		]);
	});

	it("reports the cap instead of returning a silent prefix", async () => {
		const r = await blastRadius(store, CORE, { maxDepth: 3, limit: 2 });
		expect(r.impacted).toHaveLength(2);
		expect(r.truncated).toBe(true);
		expect(r.truncation.reasons).toContain("limit");
		expect(r.truncation.dropped).toBeGreaterThan(0);
	});

	it("counts dangling ends instead of inventing nodes for them (invariant 7)", async () => {
		const ghost = fakeStore(nodes, [...edges, edge(file("ghost.ts"), "references", CORE, 9)]);
		const r = await blastRadius(ghost, CORE, { maxDepth: 1 });
		expect(r.unresolved).toBe(1);
		expect(ids(r)).not.toContain(file("ghost.ts"));
	});

	it("degrades to an empty, self-declaring answer when the store throws", async () => {
		const broken = fakeStore(nodes, edges, [CORE]);
		const r = await blastRadius(broken, CORE);
		expect(r.impacted).toEqual([]);
		expect(r.truncation.reasons).toEqual(["store_error"]);
	});

	it("never claims an edge the graph does not have", async () => {
		const r = await blastRadius(store, sym("a.ts", "absent"), { maxDepth: 3 });
		expect(r).toEqual({
			root: sym("a.ts", "absent"),
			impacted: [],
			truncated: false,
			truncation: { truncated: false, reasons: [], dropped: 0 },
			unresolved: 0,
		});
	});
});
