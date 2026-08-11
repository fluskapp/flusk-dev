/**
 * A deleted file must stop appearing in answers about the code that is left.
 *
 * `forgetFile` retracts what a file's own indexing pass OWNS — its imports, its
 * defines, and the references arriving at the symbols it defines. That is right
 * for a file that is about to be re-indexed and wrong for one that is gone: the
 * references pointing FROM it at other files' symbols belong to the DEFINING
 * file's pass, whose stamp never moved, so nothing re-runs and nothing retracts
 * them. Blast radius then keeps naming a path that no longer exists as an
 * impacted dependent, with a node whose `file` cannot be opened.
 */
import { rmSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/doc/ts-service.js";
import { blastRadius } from "../src/graph/blast-radius.js";
import { buildGraph } from "../src/graph/build.js";
import { openGraphStore } from "../src/graph/store-jsonl.js";
import { type GraphFixture, graphProject } from "./graph-fixture.js";

const GREET = "symbol:proj/src/greet.ts#greet";
const USE = "file:proj/src/use.ts";
let fx: GraphFixture;

beforeAll(async () => {
	fx = graphProject();
	process.env.AH_HOME = fx.home;
	await buildGraph({ root: fx.root, cards: [], service: { fileCap: 50 } });
}, 60_000);

afterAll(() => {
	disposeService();
	fx.cleanup();
	delete process.env.AH_HOME;
});

it("retracts the references a deleted file made, not only the ones it received", async () => {
	const before = await openGraphStore(fx.root).neighbors(GREET, {
		direction: "in",
		kinds: ["references"],
	});
	expect(before.map((n) => n.edge.from)).toContain(USE);

	rmSync(fx.src("use.ts"));
	// greet.ts is untouched, so its pass does not re-run: nothing but the
	// removal itself can drop the edge.
	const report = await buildGraph({ root: fx.root, cards: [], service: { fileCap: 50 } });
	expect(report.filesIndexed).toBe(0);

	const store = openGraphStore(fx.root);
	const after = await store.neighbors(GREET, { direction: "in", kinds: ["references"] });
	expect(after.map((n) => n.edge.from)).not.toContain(USE);

	const blast = await blastRadius(store, GREET);
	expect(blast.impacted.map((r) => r.node.id)).not.toContain(USE);
}, 90_000);
