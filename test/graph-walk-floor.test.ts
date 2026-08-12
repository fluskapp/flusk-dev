/**
 * The two ways a walk could return a floor while calling itself complete.
 *
 * THE EXACT-LIMIT BOUNDARY. The probe ring is what tells a bounded walk whether
 * anything lies beyond the depth bound, and it used to be skipped whenever the
 * hit count REACHED the cap. Landing exactly on the cap drops nothing, so no
 * "limit" reason was recorded either — and the answer came back
 * `truncated: false` with a whole ring of qualifying nodes unmentioned. It is
 * precisely the case a cap produces, and the case existing tests miss, because
 * they only ever cap a walk that really did drop a row.
 *
 * THE BUILDER'S CAP. A symbol used 400 times gets 200 reference locations from
 * the provider, so whole referencing files never get an edge at all. No query
 * cap can detect that — the triples were never written — so the node carries
 * `capped` and the walk reports "source". Without it the panel prints a short
 * list stamped complete.
 */
import { describe, expect, it } from "vitest";
import { blastRadius, neighbourhood } from "../src/graph/queries.js";
import { edge, fakeStore, file, node, sym } from "./graph-query-fixture.js";

const HUB = file("root.ts");
const ring = [file("x.ts"), file("y.ts")];
const beyond = file("z.ts");

const nodes = [HUB, ...ring, beyond].map((id) => node(id, "file"));
const edges = [
	edge(ring[0] as string, "imports", HUB),
	edge(ring[1] as string, "imports", HUB),
	edge(beyond, "imports", ring[0] as string),
];

describe("a walk that stops exactly on its cap", () => {
	it("still probes past the depth bound and admits the bound cut it", async () => {
		const store = fakeStore(nodes, edges);
		const r = await blastRadius(store, HUB, { maxDepth: 1, limit: 2 });
		expect(r.impacted).toHaveLength(2);
		// z.ts sits one ring beyond the bound. Saying nothing about it is the lie.
		expect(r.truncated).toBe(true);
		expect(r.truncation.reasons).toContain("depth");
	});

	it("does not cry truncation when the closure really is exhausted", async () => {
		// Same shape without the extra ring: two hits, cap two, nothing beyond.
		const store = fakeStore(nodes.slice(0, 3), edges.slice(0, 2));
		const r = await blastRadius(store, HUB, { maxDepth: 1, limit: 2 });
		expect(r.impacted).toHaveLength(2);
		expect(r.truncated).toBe(false);
		expect(r.truncation.reasons).toEqual([]);
	});
});

describe("a cap the BUILDER hit", () => {
	const HOT = sym("hot.ts", "hot");
	const capped = [
		{ ...node(HOT, "symbol"), capped: true },
		node(file("u0.ts"), "file"),
		node(file("hot.ts"), "file"),
	];
	const refs = [edge(file("u0.ts"), "references", HOT, 41), edge(file("hot.ts"), "defines", HOT)];

	it("reports the answer as a floor even though no query cap bit", async () => {
		const r = await blastRadius(fakeStore(capped, refs), HOT, { maxDepth: 3, limit: 100 });
		expect(r.impacted.length).toBeLessThan(100);
		expect(r.truncated).toBe(true);
		expect(r.truncation.reasons).toContain("source");
	});

	it("carries the same admission through the local picture", async () => {
		const r = await neighbourhood(fakeStore(capped, refs), HOT);
		expect(r.truncation.reasons).toContain("source");
	});

	it("says nothing when the builder recorded everything", async () => {
		const clean = capped.map((n) => ({ ...n, capped: undefined }));
		const r = await blastRadius(fakeStore(clean, refs), HOT);
		expect(r.truncation.reasons).not.toContain("source");
	});
});
