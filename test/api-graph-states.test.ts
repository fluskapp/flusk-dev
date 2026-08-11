/**
 * The states `/api/graph` answers WITH instead of answering: a project with no
 * graph, an indexed file the graph has never heard of, a path outside every
 * configured root, and a build asked for on something that is not a project.
 *
 * They are their own file because they are their own contract. The panel
 * cannot tell "no graph" from "no such node" by looking at empty arrays, so
 * the server must name which one it is AND what to do about it — a note with
 * no remedy is a dead end with better prose. Each case below asserts both.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import type { GraphReply } from "../src/ui/api-graph.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { hasRg } from "./find-fixture.js";
import { type GraphTree, graphTree, seedGraph } from "./graph-ui-fixture.js";

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

const ask = async (file: string): Promise<GraphReply> =>
	JSON.parse((await call(ui.url, `/api/graph?file=${encodeURIComponent(file)}`)).body);

rg("an indexed file that is not in the graph says so, and how to fix it", async () => {
	const d = await ask(tree.files.lonely);
	expect(d.state).toBe("unknown");
	expect(d.target).toBeNull();
	expect(d.note).toContain("but none for");
	expect(d.action).toMatch(/re-index/i);
	// The denominator: the graph is not empty, which is what makes this state
	// different from the one below.
	expect(d.stats.nodes).toBeGreaterThan(0);
});

rg("a project with no graph is a state with a remedy, not an empty answer", async () => {
	const d = await ask(`${tree.beta}/lib/x.ts`);
	expect(d.state).toBe("unindexed");
	expect(d.stats).toEqual({ nodes: 0, edges: 0 });
	expect(d.note).toContain("No code graph");
	expect(d.action).toContain("Index this project");
	expect(d.root).toBe(tree.beta);
	expect(d.blast).toBeNull();
});

rg("refuses a path outside the configured roots", async () => {
	const r = await call(ui.url, `/api/graph?file=${encodeURIComponent("/etc/hosts")}`);
	expect(r.status).toBe(400);
	expect(r.body).toContain("not an indexed file");
	expect((await call(ui.url, "/api/graph")).status).toBe(400);
});

it("refuses to build anything that is not a configured project root", async () => {
	const r = await call(ui.url, "/api/graph/build?repo=/tmp", { method: "POST" });
	expect(r.status).toBe(400);
	expect(r.body).toContain("not a configured project root");
	expect((await call(ui.url, "/api/graph/build", { method: "POST" })).status).toBe(400);
});
