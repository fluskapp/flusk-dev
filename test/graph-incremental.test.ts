/**
 * Incremental and resumable rebuilds.
 *
 * The claim under test is the one that makes the graph usable at all: opening
 * the workbench must not re-index a repo that has not changed. So a rebuild
 * with nothing touched indexes NOTHING, a rebuild after one file moves indexes
 * that file (and the files it imports, because reference edges are computed
 * from the symbol's side — see build-plan.ts), and history is skipped whole
 * while HEAD stands still.
 *
 * Resumability is asserted separately: a build capped at two files must leave
 * the other three looking dirty, and the next call must pick them up. Recording
 * files as indexed before they were is invisible until something asks the graph
 * a question it silently cannot answer.
 */
import { rmSync, writeFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/features/docs/ts-service.js";
import { buildGraph } from "../src/features/graph/build.js";
import { openGraphStore } from "../src/features/graph/store-jsonl.js";
import { commitCard, type GraphFixture, graphProject } from "./graph-fixture.js";

let fx: GraphFixture;
const CARDS = [commitCard(1, ["src/greet.ts", "src/use.ts"])];
const F = (name: string): string => `file:proj/src/${name}`;

const build = (opts: { maxFiles?: number; head?: string } = {}) =>
	buildGraph({ root: fx.root, cards: CARDS, service: { fileCap: 50 }, ...opts });

beforeAll(async () => {
	fx = graphProject();
	process.env.FLUSK_HOME = fx.home;
}, 60_000);

afterAll(() => {
	disposeService();
	fx.cleanup();
	delete process.env.FLUSK_HOME;
});

it("indexes every file the first time, and none of them the second", async () => {
	const first = await build({ head: "h1" });
	expect(first.filesIndexed).toBe(5);
	expect(first.commitsIndexed).toBe(1);
	const second = await build({ head: "h1" });
	expect(second.filesIndexed).toBe(0);
	expect(second.filesSkipped).toBe(5);
	// HEAD has not moved, so not one commit was re-read.
	expect(second.commitsIndexed).toBe(0);
	expect(second.commitsSkipped).toBe(1);
}, 60_000);

it("re-indexes one changed file, not the repo", async () => {
	writeFileSync(fx.src("alone.ts"), "export const alone = 1234;\n");
	const report = await build({ head: "h1" });
	expect(report.filesIndexed).toBe(1);
	expect(report.filesSkipped).toBe(4);
	expect(report.filesRemaining).toBe(0);
}, 60_000);

it("pulls in the files a changed file imports, so new references are seen", async () => {
	// A third call to greet(): the edge that must change hangs off `greet`,
	// which lives in the UNCHANGED greet.ts.
	writeFileSync(
		fx.src("use.ts"),
		`import { greet } from "./greet.js";
import { util } from "./util.js";

export const line = greet("world");
export const twice = \`\${greet("again")}\${util()}\`;
export const thrice = greet("third");
`,
	);
	const report = await build({ head: "h1" });
	// use.ts plus its two import targets — three of five, never all five.
	expect(report.filesIndexed).toBe(3);
	expect(report.filesSkipped).toBe(2);
	const store = openGraphStore(fx.root);
	const refs = await store.neighbors("symbol:proj/src/greet.ts#greet", {
		direction: "in",
		kinds: ["references"],
	});
	expect(refs[0]?.edge.weight).toBe(4); // import binding + three calls
}, 60_000);

it("retracts the edges of a file that no longer exists", async () => {
	const before = openGraphStore(fx.root);
	expect(await before.node(F("extra.ts"))).not.toBeNull();
	rmSync(fx.src("extra.ts"));
	await build({ head: "h1" });
	const store = openGraphStore(fx.root);
	// Its structure is gone; the node stays, because the port has no delete and
	// an inert node beats a dangling edge that lies.
	expect(await store.neighbors(F("extra.ts"), { kinds: ["defines"] })).toEqual([]);
}, 60_000);

it("indexes a bounded slice per call and resumes where it stopped", async () => {
	const fresh = graphProject();
	process.env.FLUSK_HOME = fresh.home;
	try {
		const a = await buildGraph({ root: fresh.root, cards: [], maxFiles: 2, service: { fileCap: 50 } });
		expect(a.filesIndexed).toBe(2);
		expect(a.filesRemaining).toBe(3);
		const b = await buildGraph({ root: fresh.root, cards: [], maxFiles: 2, service: { fileCap: 50 } });
		expect(b.filesIndexed).toBe(2);
		expect(b.filesRemaining).toBe(1);
		const c = await buildGraph({ root: fresh.root, cards: [], maxFiles: 2, service: { fileCap: 50 } });
		expect(c.filesIndexed).toBe(1);
		expect(c.filesRemaining).toBe(0);
		expect((await buildGraph({ root: fresh.root, cards: [], service: { fileCap: 50 } })).filesIndexed).toBe(0);
	} finally {
		process.env.FLUSK_HOME = fx.home;
		fresh.cleanup();
	}
}, 90_000);
