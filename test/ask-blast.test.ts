/**
 * The blast-radius attachment — the block a pasted snippet can never carry,
 * and the one the "what breaks if I change it" action is built on.
 *
 * Two things are asserted rather than assumed. It aims at the SYMBOL node when
 * a definition is known (`symbol:<project>/<rel>#<name>`, where `<rel>` is the
 * file the symbol is DEFINED in), because aiming at the file the reader
 * happened to be looking at mints an id nothing ever put. And an unbuilt graph
 * comes back as a sentence rather than as an empty block, because "nothing
 * depends on this" and "nothing has been indexed" are opposite answers that
 * look identical when the block is simply absent.
 */
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/doc/ts-service.js";
import { buildGraph } from "../src/graph/build.js";
import { openGraphStore } from "../src/graph/store-jsonl.js";
import { blastBlock } from "../src/ui/ask-blast.js";
import { type GraphFixture, graphProject } from "./graph-fixture.js";

let fx: GraphFixture;
let unbuilt: GraphFixture;

beforeAll(async () => {
	unbuilt = graphProject();
	fx = graphProject();
	process.env.AH_HOME = fx.home;
	await buildGraph({ root: fx.root, cards: [], service: { fileCap: 50 } });
}, 60_000);

afterAll(() => {
	disposeService();
	fx.cleanup();
	unbuilt.cleanup();
	delete process.env.AH_HOME;
});

it("names the files that reference the symbol, nearest first, with the hop", async () => {
	process.env.AH_HOME = fx.home;
	const block = await blastBlock({
		root: fx.root,
		file: fx.src("greet.ts"),
		symbol: { name: "greet", definedFile: fx.src("greet.ts") },
	});
	expect(block.note).toBeUndefined();
	expect(block.text).toContain("src/use.ts");
	// The hop is on the row: an impact list nobody can audit is one nobody trusts.
	expect(block.text).toMatch(/depth 1, via (references|defines)/);
	// Paths are repo-relative — the ids are, and an absolute one leaks a home dir.
	expect(block.text).not.toContain(fx.root);
});

it("falls back to the file when no symbol definition is known", async () => {
	process.env.AH_HOME = fx.home;
	const block = await blastBlock({ root: fx.root, file: fx.src("greet.ts") });
	expect(block.text).toContain("src/use.ts");
});

it("says nothing depends on a leaf rather than attaching an empty block", async () => {
	process.env.AH_HOME = fx.home;
	const block = await blastBlock({ root: fx.root, file: fx.src("alone.ts") });
	expect(block.text).toBeNull();
	expect(block.note).toContain("nothing that depends on");
});

it("says the graph is unbuilt rather than that nothing depends on it", async () => {
	process.env.AH_HOME = unbuilt.home;
	const block = await blastBlock({ root: unbuilt.root, file: unbuilt.src("greet.ts") });
	expect(block.text).toBeNull();
	expect(block.note).toBe("no code graph has been built for proj yet");
});

it("says the count is a floor when the walk was capped, rather than stating it", async () => {
	process.env.AH_HOME = fx.home;
	const store = openGraphStore(fx.root);
	const hub = "file:proj/src/hub.ts";
	// 150 importers of one file: the default 100-row cap bites, and the block
	// used to print "100 nodes depend on this" as though that were the total.
	await store.put(
		[
			{ id: hub, kind: "file", label: "hub.ts", file: fx.src("hub.ts") },
			...Array.from({ length: 150 }, (_, i) => ({
				id: `file:proj/src/imp${i}.ts`,
				kind: "file" as const,
				label: `imp${i}.ts`,
				file: fx.src(`imp${i}.ts`),
			})),
		],
		Array.from({ length: 150 }, (_, i) => ({
			from: `file:proj/src/imp${i}.ts`,
			kind: "imports" as const,
			to: hub,
		})),
	);
	const block = await blastBlock({ root: fx.root, file: fx.src("hub.ts") });
	expect(block.text).toContain("At least 100 nodes depend on this");
	expect(block.text).toContain("this is a floor");
	expect(block.text).toContain("limit");
});

it("states a plain count when nothing was capped", async () => {
	process.env.AH_HOME = fx.home;
	const block = await blastBlock({ root: fx.root, file: fx.src("greet.ts") });
	expect(block.text).not.toContain("At least");
	expect(block.text).toMatch(/^\d+ nodes? depends? on this, inbound:/);
});

it("refuses a file outside the project root instead of guessing an id", async () => {
	process.env.AH_HOME = fx.home;
	const block = await blastBlock({ root: fx.root, file: "/etc/passwd" });
	expect(block.text).toBeNull();
	expect(block.note).toContain("outside the project root");
});
