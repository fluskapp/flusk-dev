/**
 * Co-change against a hand-written commit history. The scores here are
 * checkable on paper: a.ts has 8 commits, b.ts shares 7 of them, c.ts 3, d.ts
 * 2 — and b/c carry the SAME builder weight, so the tie can only be broken by
 * re-derived evidence rather than by whatever order the store answered in.
 *
 * The case that matters most is the last one: a weight the `touched_by` edges
 * cannot corroborate must still show up honestly, with `confirmed: 0`, rather
 * than being dropped or padded to match the weight.
 */
import { describe, expect, it } from "vitest";
import { coChange } from "../src/graph/queries.js";
import { coEdges, commit, fakeStore, file } from "./graph-query-fixture.js";
import { A, edges, nodes } from "./graph-query-graph.js";

const store = fakeStore(nodes, edges);

describe("co-change", () => {
	it("scores peers against the root's own history", async () => {
		const r = await coChange(store, A);
		expect(r.commitsTouchingRoot).toBe(8);
		expect(r.peers.map((p) => [p.node.id, p.commits, p.confirmed, p.score])).toEqual([
			[file("b.ts"), 7, 7, 7 / 8],
			[file("c.ts"), 7, 3, 7 / 8],
			[file("d.ts"), 2, 2, 2 / 8],
		]);
		expect(r.truncation.truncated).toBe(false);
	});

	it("names the shared commits, and says how many the cap hid", async () => {
		const r = await coChange(store, A);
		const b = r.peers[0];
		expect(b?.evidence.map((c) => c.id)).toEqual([1, 2, 3, 4, 5].map(commit));
		expect(b?.confirmed).toBe(7);
		expect(b?.evidence).toHaveLength(5);
		const full = await coChange(store, A, { evidence: 10 });
		expect(full.peers[0]?.evidence).toHaveLength(7);
		for (const p of full.peers) {
			for (const c of p.evidence) expect(c.kind).toBe("commit");
		}
	});

	it("carries the one triple each row asserts", async () => {
		const r = await coChange(store, A);
		for (const p of r.peers) {
			expect(p.edge).toEqual({ from: A, kind: "changed_with", to: p.node.id, weight: p.commits });
		}
	});

	it("ranks identically whatever order the store returns edges in", async () => {
		const reversed = fakeStore(nodes, [...edges].reverse());
		expect((await coChange(reversed, A)).peers.map((p) => p.node.id)).toEqual(
			(await coChange(store, A)).peers.map((p) => p.node.id),
		);
	});

	it("reports the cap rather than returning a silent prefix", async () => {
		const r = await coChange(store, A, { limit: 1 });
		expect(r.peers.map((p) => p.node.id)).toEqual([file("b.ts")]);
		expect(r.truncation).toEqual({ truncated: true, reasons: ["limit"], dropped: 2 });
	});

	it("shows an uncorroborated weight as uncorroborated", async () => {
		const extra = fakeStore(nodes, [...edges, ...coEdges(A, file("e.ts"), 4)]);
		const peer = (await coChange(extra, A)).peers.find((p) => p.node.id === file("e.ts"));
		expect(peer?.commits).toBe(4);
		expect(peer?.confirmed).toBe(0);
		expect(peer?.evidence).toEqual([]);
	});

	it("degrades to an empty answer when the store throws", async () => {
		const r = await coChange(fakeStore(nodes, edges, [A]), A);
		expect(r.peers).toEqual([]);
		expect(r.commitsTouchingRoot).toBe(0);
		expect(r.truncation.reasons).toEqual(["store_error"]);
	});
});
