/**
 * Provenance, including the two things it must NOT do: claim chronological
 * order without a clock to supply it, and lose the row for a run that no
 * history card dates.
 *
 * The join is exercised the way it will really be used — cards keyed by `ref`,
 * with the commit cards carrying the 8-char-prefixed ids that invariant 4
 * warns about. A query that joined on `card.id` passes no test here.
 */
import { describe, expect, it } from "vitest";
import { historyClock, provenance } from "../src/features/graph/queries.js";
import { commit, doc, fakeStore, run, sha } from "./graph-query-fixture.js";
import { A, cards, edges, nodes } from "./graph-query-graph.js";

const store = fakeStore(nodes, edges);
const clock = historyClock(cards);
const README = doc("README.md");

describe("provenance", () => {
	it("orders newest first and says where the order came from", async () => {
		const r = await provenance(store, A, { clock });
		expect(r.ordered).toBe("history");
		expect(r.rows.map((row) => row.node.id)).toEqual([
			README,
			run("r1"),
			...[8, 7, 6, 5, 4, 3, 2, 1].map(commit),
			run("r2"),
		]);
		expect(r.commits).toHaveLength(8);
		expect(r.runs).toEqual([run("r1"), run("r2")].map((id) => expect.objectContaining({ id })));
		expect(r.docs.map((d) => d.id)).toEqual([README]);
	});

	it("carries the edge and the card ref behind every row", async () => {
		const r = await provenance(store, A, { clock });
		const eight = r.rows.find((row) => row.node.id === commit(8));
		expect(eight).toMatchObject({
			relation: "touched_by",
			edge: { from: A, kind: "touched_by", to: commit(8) },
			at: "2026-01-08T00:00:00.000Z",
			ref: sha(8),
		});
		const readme = r.rows.find((row) => row.node.id === README);
		expect(readme).toMatchObject({
			relation: "documents",
			edge: { from: README, kind: "documents", to: A },
		});
	});

	it("keeps an undated row instead of guessing a date for it", async () => {
		const r = await provenance(store, A, { clock });
		const last = r.rows[r.rows.length - 1];
		expect(last).toMatchObject({ at: null, ref: null });
		expect(last?.node.id).toBe(run("r2"));
	});

	it("refuses to call an undated list chronological", async () => {
		const r = await provenance(store, A);
		expect(r.ordered).toBe("id");
		expect(r.rows.every((row) => row.at === null)).toBe(true);
		expect(r.rows.map((row) => row.node.id)).toEqual([
			...[1, 2, 3, 4, 5, 6, 7, 8].map(commit),
			README,
			run("r1"),
			run("r2"),
		]);
	});

	it("reports the cap, and keeps the buckets consistent with the rows kept", async () => {
		const r = await provenance(store, A, { clock, limit: 3 });
		expect(r.rows.map((row) => row.node.id)).toEqual([README, run("r1"), commit(8)]);
		expect(r.truncation).toEqual({ truncated: true, reasons: ["limit"], dropped: 8 });
		expect(r.commits.map((c) => c.id)).toEqual([commit(8)]);
		expect(r.docs.map((d) => d.id)).toEqual([README]);
	});

	it("refuses the abbreviated-sha join that invariant 4 warns about", async () => {
		const short = cards.map((c) => (c.kind === "commit" ? { ...c, ref: c.ref.slice(0, 8) } : c));
		const r = await provenance(store, A, { clock: historyClock(short) });
		const dated = r.rows.filter((row) => row.at !== null).map((row) => row.node.id);
		expect(dated).toEqual([README, run("r1")]);
	});

	it("degrades to an empty answer when the store throws", async () => {
		const r = await provenance(fakeStore(nodes, edges, [A]), A, { clock });
		expect(r.rows).toEqual([]);
		expect(r.commits).toEqual([]);
		expect(r.truncation.reasons).toEqual(["store_error"]);
	});
});
