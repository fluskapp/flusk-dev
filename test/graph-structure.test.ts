/**
 * Structure from the language service: the edges, and the STABILITY of the ids
 * that carry them.
 *
 * The stability assertion is the important one and it is not cosmetic. An
 * unstable id does not throw — it forks the graph into two half-populated
 * islands, and every query afterwards quietly answers about one of them
 * (invariant 3). So the same repo is built twice from scratch, and then built
 * again from a SECOND CHECKOUT at a different absolute path, and all three
 * must mint byte-identical id sets.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/doc/ts-service.js";
import { buildGraph } from "../src/graph/build.js";
import { readTriples } from "../src/graph/store-io.js";
import { graphPath } from "../src/graph/store-io.js";
import { openGraphStore } from "../src/graph/store-jsonl.js";
import { cloneFixture, type GraphFixture, graphProject } from "./graph-fixture.js";

let fx: GraphFixture;
const clones: GraphFixture[] = [];

const F = (name: string): string => `file:proj/src/${name}`;
const S = (file: string, name: string): string => `symbol:proj/src/${file}#${name}`;

/** Every node the build actually put, read back off disk. */
function nodeIds(fixture: GraphFixture): string[] {
	process.env.AH_HOME = fixture.home;
	return readTriples(graphPath(fixture.root))
		.filter((t) => t.p === "kind")
		.map((t) => t.s)
		.sort();
}

/** A fresh checkout, a fresh ah home, a build from nothing. */
async function buildFresh(fixture: GraphFixture): Promise<void> {
	process.env.AH_HOME = fixture.home;
	await buildGraph({ root: fixture.root, cards: [], service: { fileCap: 50 } });
}

beforeAll(async () => {
	fx = graphProject();
	await buildFresh(fx);
}, 60_000);

afterAll(() => {
	disposeService();
	for (const c of clones) c.cleanup();
	fx.cleanup();
	delete process.env.AH_HOME;
});

it("derives import edges between the files that actually import each other", async () => {
	process.env.AH_HOME = fx.home;
	const store = openGraphStore(fx.root);
	const imports = await store.neighbors(F("use.ts"), { kinds: ["imports"] });
	expect(imports.map((n) => n.edge.to).sort()).toEqual([F("greet.ts"), F("util.ts")]);
	// Direction is fixed: importer → imported, never the reverse.
	expect(await store.neighbors(F("greet.ts"), { kinds: ["imports"] })).toEqual([]);
	expect(
		(await store.neighbors(F("greet.ts"), { direction: "in", kinds: ["imports"] })).map(
			(n) => n.edge.from,
		),
	).toEqual([F("use.ts")]);
	// An island imports nothing and is imported by nothing — it still defines
	// its own symbol, which is why this asks about `imports` and not about all.
	expect(await store.neighbors(F("alone.ts"), { direction: "both", kinds: ["imports"] })).toEqual(
		[],
	);
});

it("attaches each symbol to the file that DEFINES it", async () => {
	process.env.AH_HOME = fx.home;
	const store = openGraphStore(fx.root);
	const defines = await store.neighbors(F("greet.ts"), { kinds: ["defines"] });
	expect(defines.map((n) => n.edge.to).sort()).toEqual([S("greet.ts", "Person"), S("greet.ts", "greet")]);
	const symbol = await store.node(S("greet.ts", "greet"));
	expect(symbol).toMatchObject({ kind: "symbol", label: "greet", line: 2 });
	expect(symbol?.file).toBe(fx.src("greet.ts"));
});

it("points a reference edge from the referencing FILE at the referenced symbol", async () => {
	process.env.AH_HOME = fx.home;
	const store = openGraphStore(fx.root);
	const refs = await store.neighbors(S("greet.ts", "greet"), {
		direction: "in",
		kinds: ["references"],
	});
	expect(refs).toHaveLength(1);
	expect(refs[0]?.edge.from).toBe(F("use.ts"));
	// Weight is a usage COUNT: two calls plus the import binding.
	expect(refs[0]?.edge.weight).toBe(3);
	// A symbol nobody uses has no inbound reference at all.
	expect(
		await store.neighbors(S("alone.ts", "alone"), { direction: "in", kinds: ["references"] }),
	).toEqual([]);
});

it("mints identical ids on a rebuild and on a second checkout (invariant 3)", async () => {
	const first = nodeIds(fx);
	expect(first).toContain(F("greet.ts"));
	// Same tree, same path, empty home: nothing may be remembered from before.
	const again = graphProject();
	clones.push(again);
	await buildFresh(again);
	const rebuilt = nodeIds(again);
	// A different absolute path, the same repo: ids carry the BASENAME, so a
	// second clone must share every node rather than duplicate the graph.
	const clone = cloneFixture(fx);
	clones.push(clone);
	await buildFresh(clone);
	expect(rebuilt).toEqual(first);
	expect(nodeIds(clone)).toEqual(first);
	expect(first.some((id) => id.includes(fx.root))).toBe(false);
}, 90_000);
