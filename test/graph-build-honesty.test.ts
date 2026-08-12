/**
 * What a build is allowed to REMEMBER, and what it must still do.
 *
 * Every case here is silent: the graph ends up permanently missing edges while
 * the resume record says it is current, so nothing looks dirty again and no
 * report says a word. The three ways that happened: a fold gated on git HEAD,
 * so runs and docs never entered the graph between commits; a resume record
 * saved after the log write FAILED; and files stamped as indexed by a pass
 * whose language service refused, after it had retracted their edges.
 */
import { chmodSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { disposeService } from "../src/features/docs/ts-service.js";
import { buildGraph } from "../src/features/graph/build.js";
import { graphPath, statePath } from "../src/features/graph/store-io.repository.js";
import { openGraphStore } from "../src/features/graph/store-jsonl.js";
import { commitCard, type GraphFixture, graphProject, sessionCard } from "./graph-fixture.js";

let fx: GraphFixture | null = null;

function project(): GraphFixture {
	fx = graphProject();
	process.env.FLUSK_HOME = fx.home;
	return fx;
}

afterEach(() => {
	disposeService();
	if (fx !== null) {
		try {
			chmodSync(graphPath(fx.root), 0o644);
		} catch {
			// the test never made it read-only
		}
		fx.cleanup();
	}
	fx = null;
	delete process.env.FLUSK_HOME;
});

it("folds sessions and docs between commits — HEAD gates the git walk, not the corpus", async () => {
	const p = project();
	const commits = [commitCard(1, ["src/greet.ts"])];
	await buildGraph({ root: p.root, cards: commits, head: "h1", service: { fileCap: 50 } });
	// An agent run lands. HEAD has not moved: no commit is new, but the run is.
	const withRun = [...commits, sessionCard("run-a", ["src/alone.ts"])];
	const again = await buildGraph({
		root: p.root,
		cards: withRun,
		head: "h1",
		service: { fileCap: 50 },
	});
	expect(again.commitsIndexed).toBe(0); // the sha set still does its job
	const store = openGraphStore(p.root);
	expect(await store.node("run:run-a")).not.toBeNull();
	const touched = await store.neighbors("file:proj/src/alone.ts", {
		direction: "out",
		kinds: ["touched_by"],
	});
	expect(touched.map((n) => n.edge.to)).toEqual(["run:run-a"]);
}, 90_000);

it("does not record a pass the log refused to accept", async () => {
	const p = project();
	const first = await buildGraph({
		root: p.root,
		cards: [commitCard(1, ["src/greet.ts"])],
		head: "h1",
		service: { fileCap: 50 },
	});
	expect(first.filesIndexed).toBe(5);
	const before = readFileSync(statePath(p.root), "utf8");
	// The log becomes unwritable, and a second commit arrives.
	chmodSync(graphPath(p.root), 0o444);
	const blocked = await buildGraph({
		root: p.root,
		cards: [commitCard(1, ["src/greet.ts"]), commitCard(2, ["src/util.ts"])],
		head: "h2",
		service: { fileCap: 50 },
	});
	expect(blocked.reason).toContain("EACCES");
	// The record must be exactly what it was: saving it here would mark commit 2
	// folded and HEAD moved, and no later build would ever re-fold it.
	expect(readFileSync(statePath(p.root), "utf8")).toBe(before);
	chmodSync(graphPath(p.root), 0o644);
	const recovered = await buildGraph({
		root: p.root,
		cards: [commitCard(1, ["src/greet.ts"]), commitCard(2, ["src/util.ts"])],
		head: "h2",
		service: { fileCap: 50 },
	});
	expect(recovered.commitsIndexed).toBe(1);
	expect(await openGraphStore(p.root).node(`commit:proj:${"2".padStart(40, "0")}`)).not.toBeNull();
}, 120_000);

/**
 * A project the SCAN accepts and the SERVICE refuses: `scanProject` skips
 * `.d.ts` while tsconfig's include reaches them, and ts-service re-checks the
 * cap against the resolved file set. That is the one arrangement in which the
 * structure pass runs with `provider === null` — the over-cap branch above it
 * short-circuits before `sliceStructure` and stamps nothing already.
 */
function refusable(): GraphFixture {
	const p = project();
	writeFileSync(join(p.root, "tsconfig.json"), JSON.stringify({ include: ["src"] }));
	for (const name of ["one.d.ts", "two.d.ts", "three.d.ts"]) {
		writeFileSync(p.src(name), "export declare const x: number;\n");
	}
	return p;
}

/** Cap 5: the scan sees the 5 .ts files, the config sees 8 and refuses. */
const REFUSING = { fileCap: 5 };
const HEALTHY = { fileCap: 50 };

it("leaves a file dirty when the language service could not derive its symbols", async () => {
	const p = refusable();
	const degraded = await buildGraph({ root: p.root, cards: [], service: REFUSING });
	expect(degraded.reason).toContain("too large to index");
	// The pass still wrote file nodes and still RETRACTED; stamping these files
	// would strand their symbols until somebody happened to edit them.
	expect(degraded.filesIndexed).toBe(0);
	disposeService();
	// Nothing changed on disk, yet a healthy build must still do the work.
	const healthy = await buildGraph({ root: p.root, cards: [], service: HEALTHY });
	expect(healthy.filesIndexed).toBe(5);
	expect(await openGraphStore(p.root).node("symbol:proj/src/greet.ts#greet")).not.toBeNull();
}, 120_000);

it("re-derives symbols a degraded pass retracted, without the file being touched", async () => {
	const p = refusable();
	await buildGraph({ root: p.root, cards: [], service: HEALTHY });
	expect(await openGraphStore(p.root).node("symbol:proj/src/greet.ts#greet")).not.toBeNull();
	disposeService();
	writeFileSync(p.src("greet.ts"), `${readFileSync(p.src("greet.ts"), "utf8")}\n// edit\n`);
	// The edit lands in a build with no service: greet.ts's defines are dropped.
	const degraded = await buildGraph({ root: p.root, cards: [], service: REFUSING });
	expect(degraded.filesIndexed).toBe(0);
	disposeService();
	const healthy = await buildGraph({ root: p.root, cards: [], service: HEALTHY });
	expect(healthy.filesIndexed).toBeGreaterThan(0);
	const defines = await openGraphStore(p.root).neighbors("file:proj/src/greet.ts", {
		kinds: ["defines"],
	});
	expect(defines.map((n) => n.edge.to)).toContain("symbol:proj/src/greet.ts#greet");
}, 120_000);
