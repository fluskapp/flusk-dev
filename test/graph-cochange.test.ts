/**
 * Co-change: the edge no language service can produce, derived from a
 * synthetic commit history so the expected weight is arithmetic rather than
 * an opinion.
 *
 * The assertion that protects the feature is ACCUMULATION. `put` is an upsert
 * keyed by the triple, so folding three new commits must add to the stored
 * count rather than replace it — get that wrong and a repo's coupling silently
 * resets to "3" every time someone commits.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { coChangeEdges, coChangePairs } from "../src/features/graph/build-cochange.js";
import { historyGraph } from "../src/features/graph/build-history.repository.js";
import { foldHistory } from "../src/features/graph/fold-history.js";
import { idsFor, type Ids } from "../src/features/graph/ids.js";
import { coChange, provenance } from "../src/features/graph/queries.js";
import { emptyResume } from "../src/features/graph/state.repository.js";
import { type JsonlGraph, openGraphAt } from "../src/features/graph/store-jsonl.js";
import { commitCard, type GraphFixture, graphProject, sessionCard, sha } from "./graph-fixture.js";

let fx: GraphFixture;
let ids: Ids;

const F = (name: string): string => `file:proj/src/${name}`;
const GREET = F("greet.ts");

/** greet+use twice, greet+util once, alone on its own, and one 30-file sweep. */
const CARDS = [
	commitCard(1, ["src/greet.ts", "src/use.ts"]),
	commitCard(2, ["src/greet.ts", "src/use.ts"]),
	commitCard(3, ["src/greet.ts", "src/util.ts"]),
	commitCard(4, ["src/alone.ts"]),
	commitCard(
		5,
		Array.from({ length: 30 }, (_, i) => `src/gen/f${i}.ts`),
		"chore: format",
	),
];

beforeAll(() => {
	fx = graphProject();
	ids = idsFor(fx.root);
});
afterAll(() => fx.cleanup());

/** A store with the whole synthetic history folded in once. */
async function folded(name: string, cards = CARDS): Promise<JsonlGraph> {
	const store = openGraphAt(`${fx.home}/${name}.jsonl`);
	const part = historyGraph(ids, cards);
	const edges = await coChangeEdges(store, coChangePairs(ids, cards));
	await store.put(part.nodes, [...part.edges, ...edges]);
	return store;
}

it("counts how many commits changed each pair of files", async () => {
	const store = await folded("weights");
	const peers = await store.neighbors(GREET, { kinds: ["changed_with"] });
	const byId = new Map(peers.map((n) => [n.edge.to, n.edge.weight]));
	expect(byId.get(F("use.ts"))).toBe(2);
	expect(byId.get(F("util.ts"))).toBe(1);
	// A file that only ever changed alone has no peers at all.
	expect(await store.neighbors(F("alone.ts"), { kinds: ["changed_with"] })).toEqual([]);
});

it("writes the pair BOTH ways, because changed_with is symmetric (invariant 8)", async () => {
	const store = await folded("symmetry");
	const back = await store.neighbors(F("use.ts"), { kinds: ["changed_with"] });
	expect(back.map((n) => n.edge.to)).toContain(GREET);
	expect(back.find((n) => n.edge.to === GREET)?.edge.weight).toBe(2);
});

it("ignores a sweep commit: 30 files at once is not evidence of coupling", async () => {
	const store = await folded("sweep");
	expect(await store.neighbors("file:proj/src/gen/f0.ts", { kinds: ["changed_with"] })).toEqual([]);
	// The sweep's own touched_by edges are still there — it did touch them.
	const touched = await store.neighbors("file:proj/src/gen/f0.ts", { kinds: ["touched_by"] });
	expect(touched[0]?.edge.to).toBe(`commit:proj:${sha(5)}`);
});

it("joins commits by the FULL sha, never the abbreviated card id (invariant 4)", async () => {
	const store = await folded("provenance");
	const node = await store.node(`commit:proj:${sha(1)}`);
	expect(node).toMatchObject({ kind: "commit", label: "commit 1" });
	// The card's own id abbreviates to 8 chars; that id must NOT be a node.
	expect(await store.node(CARDS[0]?.id ?? "")).toBeNull();
	const p = await provenance(store, GREET);
	expect(p.commits.map((c) => c.id).sort()).toEqual([
		`commit:proj:${sha(1)}`,
		`commit:proj:${sha(2)}`,
		`commit:proj:${sha(3)}`,
	]);
});

it("separates an agent run from a commit, by node kind", async () => {
	const store = await folded("runs", [...CARDS, sessionCard("s-1", ["src/greet.ts"])]);
	const p = await provenance(store, GREET);
	expect(p.runs.map((r) => r.id)).toEqual(["run:s-1"]);
	expect(p.commits).toHaveLength(3);
});

it("ADDS a later fold's commits to the stored weight rather than replacing it", async () => {
	const store = openGraphAt(`${fx.home}/accumulate.jsonl`);
	const resume = emptyResume(ids);
	const first = await foldHistory(ids, store, resume, null, CARDS.slice(0, 2));
	await store.put(first.nodes, first.edges);
	expect(first.commitsIndexed).toBe(2);

	// The same two commits plus a third: the two already folded are SKIPPED,
	// and the pair they created keeps the count they gave it.
	const second = await foldHistory(ids, store, resume, null, [
		...CARDS.slice(0, 2),
		commitCard(6, ["src/greet.ts", "src/use.ts"]),
	]);
	await store.put(second.nodes, second.edges);
	expect(second.commitsIndexed).toBe(1);
	expect(second.commitsSkipped).toBe(2);
	const peers = await store.neighbors(GREET, { kinds: ["changed_with"] });
	expect(peers.find((n) => n.edge.to === F("use.ts"))?.edge.weight).toBe(3);
	const report = await coChange(store, GREET);
	expect(report.peers[0]?.node.id).toBe(F("use.ts"));
	expect(report.peers[0]?.commits).toBe(3);
});

it("REPLACES the weight when the resume record was discarded, rather than doubling it", async () => {
	// The record and the log are separate files (store-io.ts), so a version bump
	// or a truncated state.json leaves a fully-weighted log behind a record that
	// remembers nothing. The recount is then a TOTAL, and adding it to what the
	// log holds inflates every count — permanently, and again on every recurrence.
	const store = openGraphAt(`${fx.home}/rebuild.jsonl`);
	const cards = CARDS.slice(0, 2);
	const first = await foldHistory(ids, store, emptyResume(ids), null, cards);
	await store.put(first.nodes, first.edges);
	const weight = async () =>
		(await store.neighbors(GREET, { kinds: ["changed_with"] })).find(
			(n) => n.edge.to === F("use.ts"),
		)?.edge.weight;
	const truth = await weight();
	expect(truth).toBe(2);

	for (let pass = 0; pass < 2; pass++) {
		// A fresh record every time: exactly what loadResume returns for a corrupt
		// or version-bumped state.json.
		const again = await foldHistory(ids, store, emptyResume(ids), null, cards);
		await store.put(again.nodes, again.edges);
		expect(await weight()).toBe(truth);
	}
	const report = await coChange(store, GREET);
	expect(report.peers[0]?.commits).toBe(2);
	expect(report.peers[0]?.confirmed).toBe(2);
});
