/**
 * `/api/graph` over a real socket, against a graph written by the real JSONL
 * adapter.
 *
 * This half covers the ANSWERS; api-graph-states.test.ts covers the states it
 * answers with instead. Two properties are load-bearing here, and both are
 * asserted rather than assumed:
 *
 *  - EVERY ROW CARRIES ITS EVIDENCE. A ranked list a reader cannot audit is a
 *    list they cannot trust, so a blast row without its `path`, a co-change
 *    peer without its `edge`, or a provenance row without its `edge` is a bug
 *    even though the ranking above it is correct.
 *  - THE SYMBOL IS IDENTIFIED BY WHERE IT IS DEFINED. Asking with the defining
 *    file finds it; the same name asked about from a file that merely uses it
 *    is honestly reported as absent rather than answered about by accident.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import type { GraphReply } from "../src/ui/api-graph.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { hasRg } from "./find-fixture.js";
import { type GraphTree, graphTree, IDS, SHA, seedGraph } from "./graph-ui-fixture.js";

/** ripgrep decides what is indexable; without it nothing is answerable. */
const rg = it.skipIf(!hasRg());

let tree: GraphTree;
let ui: UiServer;

beforeAll(async () => {
	tree = graphTree();
	await seedGraph(tree);
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	tree.cleanup();
});

const ask = async (file: string, symbol?: string): Promise<GraphReply> => {
	const extra = symbol === undefined ? "" : `&symbol=${encodeURIComponent(symbol)}`;
	const r = await call(ui.url, `/api/graph?file=${encodeURIComponent(file)}${extra}`);
	return JSON.parse(r.body) as GraphReply;
};

rg("answers about a file with the four questions, and states its size", async () => {
	const d = await ask(tree.files.b);
	expect(d.state).toBe("ok");
	expect(d.project).toBe("alpha");
	expect(d.target?.id).toBe(IDS.b);
	expect(d.stats.nodes).toBeGreaterThan(0);
	expect(d.stats.edges).toBeGreaterThan(0);
	expect(d.note).toBeUndefined();
});

rg("blast radius walks INBOUND, ranks nearest first, and shows the hops", async () => {
	const d = await ask(tree.files.b);
	const rows = d.blast?.impacted ?? [];
	expect(rows.map((r) => r.node.id)).toEqual([IDS.a, IDS.d]);
	expect(rows[0]?.depth).toBe(1);
	expect(rows[1]?.depth).toBe(2);
	// The audit trail: one edge per hop, ending at the row's own node.
	expect(rows[0]?.path).toEqual([{ from: IDS.a, kind: "imports", to: IDS.b }]);
	expect(rows[1]?.path.map((e) => e.from)).toEqual([IDS.a, IDS.d]);
	for (const r of rows) expect(r.path.length).toBe(r.depth);
	// The dangling edge is counted, never turned into a node (invariant 7).
	expect(d.blast?.unresolved).toBe(1);
});

rg("co-change re-confirms the weight from commits on both ends", async () => {
	const d = await ask(tree.files.b);
	const peer = d.cochange?.peers[0];
	expect(peer?.node.id).toBe(IDS.c);
	expect(peer?.commits).toBe(3);
	// The builder counted three; this store holds one. Reported as a gap, not
	// hidden behind the weight it could simply have echoed.
	expect(peer?.confirmed).toBe(1);
	expect(peer?.evidence.map((n) => n.id)).toEqual([IDS.commit]);
	expect(peer?.edge).toEqual({ from: IDS.b, kind: "changed_with", to: IDS.c, weight: 3 });
});

rg("provenance carries the commit and the doc, and will not claim an order", async () => {
	const d = await ask(tree.files.b);
	const rows = d.provenance?.rows ?? [];
	expect(rows.map((r) => r.relation).sort()).toEqual(["documents", "touched_by"]);
	for (const r of rows) expect(r.edge.kind).toBe(r.relation);
	expect(rows.some((r) => r.node.id === `commit:alpha:${SHA}`)).toBe(true);
	// A clock was available, so the report is entitled to claim an order.
	expect(d.provenance?.ordered).toBe("history");
	// The commit row is undated: the join is card.ref equality and a synthetic
	// sha matches no card. A clock that guessed would be worse than no clock, so
	// "no card matched" has to survive as null.
	const commitRow = rows.find((r) => r.node.id === `commit:alpha:${SHA}`);
	expect(commitRow?.at).toBe(null);
	expect(commitRow?.ref).toBe(null);
	// The doc row IS dated: docs/notes.md is really on disk, so the corpus has a
	// card for it, and the doc branch of the clock has to reach it. It mints an
	// ABSOLUTE ref, which the clock once refused outright — leaving every
	// documents row undated while the report still claimed "history" order.
	const docRow = rows.find((r) => r.relation === "documents");
	expect(docRow?.node.id).toBe(IDS.doc);
	expect(typeof docRow?.at).toBe("string");
	expect(docRow?.ref).toContain("docs/notes.md");
});

rg("the local subgraph is closed: every edge has both ends in nodes", async () => {
	const d = await ask(tree.files.b);
	const local = d.local;
	const ids = new Set([local?.root, ...(local?.nodes ?? []).map((n) => n.node.id)]);
	expect(ids.has(IDS.greet)).toBe(true);
	for (const e of local?.edges ?? []) {
		expect(ids.has(e.from)).toBe(true);
		expect(ids.has(e.to)).toBe(true);
	}
	// a.ts -references-> greet joins two NEIGHBOURS: the closure sees it although
	// no walk from the centre ever traversed it.
	expect((local?.edges ?? []).some((e) => e.kind === "references")).toBe(true);
	// Every node states which hop put it on the canvas.
	for (const n of local?.nodes ?? []) expect(n.path.length).toBeGreaterThan(0);
});

rg("finds a symbol by the file it is DEFINED in, and only there", async () => {
	const defined = await ask(tree.files.b, "greet");
	expect(defined.state).toBe("ok");
	expect(defined.target?.id).toBe(IDS.greet);
	// a references it, b defines it, and d imports a — implication travels.
	expect(defined.blast?.impacted.map((r) => r.node.id).sort()).toEqual([IDS.a, IDS.b, IDS.d]);
	expect(defined.blast?.impacted.filter((r) => r.depth === 2).map((r) => r.via)).toEqual([
		"imports",
	]);
	// Asked about from the file that merely USES it, the same name is a
	// different id — reported absent rather than answered about by accident.
	const used = await ask(tree.files.a, "greet");
	expect(used.state).toBe("unknown");
	expect(used.action).toContain("DEFINED");
});
