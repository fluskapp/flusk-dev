/**
 * Two declarations, two nodes — and a node that admits its edges are a floor.
 *
 * `symbol:<project>/<rel>#<name>` is keyed by name, so `class A { run() }`
 * beside `class B { run() }` in one file used to mint ONE node: the second was
 * dropped, its call sites were never recorded, and a click on `B.run` returned
 * A.run's line and A.run's callers with nothing saying anything had been
 * merged. An id that exists is exactly what makes that answer confident.
 *
 * The second case is the provider's reference cap. It counts past 200 and lists
 * 200, so a hot symbol loses whole referencing files — a loss no query can see,
 * because those triples were never written.
 */

import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import { MAX_REFERENCES } from "../src/doc/ts-provider.js";
import { disposeService } from "../src/doc/ts-service.js";
import { buildGraph } from "../src/graph/build.js";
import { openGraphStore } from "../src/graph/store-jsonl.js";
import { type GraphFixture, graphProject } from "./graph-fixture.js";

let fx: GraphFixture;
const S = (name: string): string => `symbol:proj/src/pair.ts#${name}`;

/** Eight files each calling `hot()` enough times to blow the 200-usage cap. */
function hotProject(p: GraphFixture): void {
	writeFileSync(p.src("hot.ts"), "export function hot(): number { return 1; }\n");
	const per = Math.ceil((MAX_REFERENCES * 2) / 8);
	for (let i = 0; i < 8; i++) {
		const calls = Array.from({ length: per }, (_, n) => `export const v${n} = hot();`).join("\n");
		writeFileSync(p.src(`u${i}.ts`), `import { hot } from "./hot.js";\n${calls}\n`);
	}
}

beforeAll(async () => {
	fx = graphProject();
	process.env.AH_HOME = fx.home;
	writeFileSync(
		fx.src("pair.ts"),
		"export class Alpha { run(): number { return 1; } }\n" +
			"export class Beta { run(): number { return 2; } }\n",
	);
	writeFileSync(
		fx.src("callers.ts"),
		'import { Alpha, Beta } from "./pair.js";\n' +
			"export const a = new Alpha().run();\n" +
			"export const b = new Beta().run();\n" +
			"export const c = new Beta().run();\n",
	);
	hotProject(fx);
	await buildGraph({ root: fx.root, cards: [], service: { fileCap: 80 } });
}, 120_000);

afterAll(() => {
	disposeService();
	fx.cleanup();
	delete process.env.AH_HOME;
});

it("gives two same-named methods two nodes rather than merging them silently", async () => {
	const store = openGraphStore(fx.root);
	const alpha = await store.node(S("Alpha.run"));
	const beta = await store.node(S("Beta.run"));
	expect(alpha).not.toBeNull();
	expect(beta).not.toBeNull();
	expect(alpha?.line).not.toBe(beta?.line);
	// The bare name is the id that used to answer for both. Nothing may hold it:
	// a node there is an answer about one symbol dressed up as an answer about
	// the other, and "not in the graph" is the only honest alternative.
	expect(await store.node(S("run"))).toBeNull();
});

it("records each of them with its OWN call sites", async () => {
	const store = openGraphStore(fx.root);
	const refs = async (id: string) =>
		(await store.neighbors(id, { direction: "in", kinds: ["references"] })).map(
			(n) => n.edge.weight,
		);
	expect(await refs(S("Alpha.run"))).toEqual([1]);
	expect(await refs(S("Beta.run"))).toEqual([2]);
});

it("leaves an unambiguous name unqualified, so the panel's aim still lands", async () => {
	const store = openGraphStore(fx.root);
	expect(await store.node("symbol:proj/src/greet.ts#greet")).not.toBeNull();
	expect(await store.node("symbol:proj/src/pair.ts#Alpha")).not.toBeNull();
});

it("marks a symbol whose references the provider capped", async () => {
	const store = openGraphStore(fx.root);
	const hot = await store.node("symbol:proj/src/hot.ts#hot");
	expect(hot?.capped).toBe(true);
	// The cap really did cost whole files, which is what makes the flag matter.
	const refs = await store.neighbors("symbol:proj/src/hot.ts#hot", {
		direction: "in",
		kinds: ["references"],
	});
	expect(refs.length).toBeLessThan(8);
	// A symbol under the cap says nothing, so the flag means something.
	expect((await store.node("symbol:proj/src/greet.ts#greet"))?.capped).toBeUndefined();
});
