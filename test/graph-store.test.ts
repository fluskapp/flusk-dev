/**
 * The JSONL adapter: an edge on disk must BE a triple, and replaying the log
 * must be idempotent.
 *
 * Idempotency is the assertion that matters. The log is append-only, so a
 * rebuild genuinely writes the same triple again; if replay did not collapse
 * them, every edge would gain a duplicate per build and every weight would be
 * whichever copy happened to be read last.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { openGraphAt } from "../src/graph/store-jsonl.js";
import type { GraphNode } from "../src/graph/types.js";

const dir = mkdtempSync(join(tmpdir(), "ah-graphstore-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const path = (name: string): string => join(dir, `${name}.jsonl`);
const fileNode = (id: string): GraphNode => ({ id, kind: "file", label: id, file: `/x/${id}` });
const lines = (p: string): string[] => readFileSync(p, "utf8").trim().split("\n");

it("writes an edge as the triple (subject, predicate, object)", async () => {
	const p = path("shape");
	const store = openGraphAt(p);
	await store.put([fileNode("file:p/a.ts")], [{ from: "file:p/a.ts", kind: "imports", to: "file:p/b.ts" }]);
	const rows = lines(p).map((l) => JSON.parse(l) as Record<string, unknown>);
	expect(rows).toContainEqual({ s: "file:p/a.ts", p: "imports", o: "file:p/b.ts" });
	// The node is facts on its own id — nothing else, and no store-specific keys.
	expect(rows).toContainEqual({ s: "file:p/a.ts", p: "kind", o: "file" });
	expect(rows.every((r) => Object.keys(r).every((k) => ["s", "p", "o", "w"].includes(k)))).toBe(true);
});

it("collapses a repeated put into one edge and one node (invariant 6)", async () => {
	const p = path("idempotent");
	const node = fileNode("file:p/a.ts");
	const edge = { from: "file:p/a.ts", kind: "imports" as const, to: "file:p/b.ts" };
	for (const _ of [0, 1, 2]) {
		const store = openGraphAt(p);
		await store.put([node], [edge]);
	}
	// Three builds really did append three copies…
	expect(lines(p).length).toBeGreaterThan(3);
	// …and the replayed graph still holds exactly one of each.
	const reopened = openGraphAt(p);
	expect(reopened.stats()).toMatchObject({ nodes: 1, edges: 1 });
	expect(await reopened.neighbors("file:p/a.ts")).toHaveLength(1);
});

it("reports a dangling far end as node null, inventing nothing (invariant 7)", async () => {
	const store = openGraphAt(path("dangling"));
	await store.put([fileNode("file:p/a.ts")], [{ from: "file:p/a.ts", kind: "imports", to: "file:p/gone.ts" }]);
	const [hit] = await store.neighbors("file:p/a.ts");
	expect(hit?.edge.to).toBe("file:p/gone.ts");
	expect(hit?.node).toBeNull();
	expect(await store.node("file:p/gone.ts")).toBeNull();
	expect(await store.neighbors("file:p/never")).toEqual([]);
});

it("indexes both directions, filters by kind, and round-trips a weight", async () => {
	const store = openGraphAt(path("dirs"));
	await store.put(
		[fileNode("file:p/a.ts"), fileNode("file:p/b.ts")],
		[
			{ from: "file:p/a.ts", kind: "imports", to: "file:p/b.ts" },
			{ from: "file:p/a.ts", kind: "changed_with", to: "file:p/b.ts", weight: 7 },
		],
	);
	const inbound = await store.neighbors("file:p/b.ts", { direction: "in", kinds: ["imports"] });
	expect(inbound).toHaveLength(1);
	expect(inbound[0]?.node?.id).toBe("file:p/a.ts");
	const co = await store.neighbors("file:p/a.ts", { kinds: ["changed_with"] });
	expect(co[0]?.edge.weight).toBe(7);
	expect(await store.neighbors("file:p/a.ts", { direction: "both" })).toHaveLength(2);
});

it("forgets retracted edges, and the retraction survives a reopen", async () => {
	const p = path("forget");
	const store = openGraphAt(p);
	await store.put(
		[fileNode("file:p/a.ts")],
		[
			{ from: "file:p/a.ts", kind: "imports", to: "file:p/b.ts" },
			{ from: "file:p/a.ts", kind: "defines", to: "symbol:p/a.ts#x" },
		],
	);
	store.forgetOut("file:p/a.ts", ["imports"]);
	expect(store.flush().ok).toBe(true);
	const reopened = openGraphAt(p);
	const kinds = (await reopened.neighbors("file:p/a.ts")).map((n) => n.edge.kind);
	expect(kinds).toEqual(["defines"]);
	// An append could not express that: the file was rewritten, not grown.
	expect(readFileSync(p, "utf8")).not.toContain('"imports"');
});
