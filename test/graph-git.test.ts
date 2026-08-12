/**
 * The whole build against a REAL git repo, with nothing injected: the cards
 * come from `gitCards`, the "has history moved" stamp comes from `headOid`,
 * and the structure comes from a language service pointed at the same tree.
 *
 * This is the test that would catch the join going wrong end to end. Every
 * other history test hands in cards whose `ref` is a tidy 40-hex string; only
 * this one proves that what git actually emits lands on a node id that the
 * provenance query can find, and that a second build really does skip history
 * because HEAD has not moved.
 */
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, expect, it } from "vitest";
import { disposeService } from "../src/doc/ts-service.js";
import { buildGraph, type BuildReport } from "../src/graph/build.js";
import { coChange, historyClock, provenance } from "../src/graph/queries.js";
import { gitCards } from "../src/history/source-git.js";
import { type JsonlGraph, openGraphStore } from "../src/graph/store-jsonl.js";
import { type GraphFixture, graphProject } from "./graph-fixture.js";

let fx: GraphFixture;
let store: JsonlGraph;
let first: BuildReport;
let head = "";

const F = (name: string): string => `file:proj/src/${name}`;

/**
 * scaffold → greet+use+util → greet+use → greet+util, in one shell.
 * Each commit gets an EXPLICIT date a day apart: four commits made in the same
 * second are a genuine tie, and a tie makes "newest first" unassertable.
 */
const at = (day: number): string =>
	`GIT_AUTHOR_DATE="2026-01-0${day}T00:00:00Z" GIT_COMMITTER_DATE="2026-01-0${day}T00:00:00Z"`;

const SCRIPT = `set -e
git init -q -b main
git config user.email t@example.com
git config user.name T
git config commit.gpgsign false
git add tsconfig.json src/alone.ts src/extra.ts
${at(1)} git commit -q -m "chore: scaffold"
git add src/greet.ts src/use.ts src/util.ts
${at(2)} git commit -q -m "feat: greet"
echo "// tweak" >> src/greet.ts
echo "// tweak" >> src/use.ts
${at(3)} git commit -qam "feat: tweak greeting"
echo "// fix" >> src/greet.ts
echo "// fix" >> src/util.ts
${at(4)} git commit -qam "fix: util rounding"
git rev-parse HEAD
`;

beforeAll(async () => {
	fx = graphProject();
	process.env.FLUSK_HOME = fx.home;
	const res = spawnSync("sh", ["-c", SCRIPT], { cwd: fx.root, encoding: "utf8" });
	if (res.status !== 0) throw new Error(`fixture failed: ${res.stderr}`);
	head = res.stdout.trim();
	first = await buildGraph({ root: fx.root, service: { fileCap: 50 } });
	store = openGraphStore(fx.root);
}, 90_000);

afterAll(() => {
	disposeService();
	fx.cleanup();
	delete process.env.FLUSK_HOME;
});

it("mints a commit node carrying the full 40-hex sha git printed", async () => {
	expect(head).toMatch(/^[0-9a-f]{40}$/);
	expect(first.commitsIndexed).toBe(4);
	const node = await store.node(`commit:proj:${head}`);
	expect(node).toMatchObject({ kind: "commit", label: "fix: util rounding" });
});

it("answers which commits touched a file, newest first", async () => {
	// The clock comes from the CARDS, because the graph stores no timestamps
	// (invariant 13) — the same cards the build was fed, joined back on `ref`.
	const p = await provenance(store, F("greet.ts"), { clock: historyClock(gitCards(fx.root)) });
	// scaffold did not touch greet.ts; the other three did.
	expect(p.commits).toHaveLength(3);
	expect(p.ordered).toBe("history");
	expect(p.rows[0]?.node.label).toBe("fix: util rounding");
	expect(p.rows[0]?.ref).toBe(head);
});

it("derives co-change weights from the real commit history", async () => {
	const report = await coChange(store, F("greet.ts"));
	const weights = new Map(report.peers.map((p) => [p.node.id, p.commits]));
	expect(weights.get(F("use.ts"))).toBe(2);
	expect(weights.get(F("util.ts"))).toBe(2);
	// alone.ts only ever moved in the scaffold commit, alongside extra.ts.
	expect(weights.get(F("alone.ts"))).toBeUndefined();
});

it("joins structure to history on the same file node", async () => {
	const both = await store.neighbors(F("greet.ts"), { direction: "both" });
	const kinds = new Set(both.map((n) => n.edge.kind));
	// One node, reached by the language service AND by git — which is the point
	// of deriving ids from paths rather than from whatever each source calls it.
	expect(kinds.has("defines")).toBe(true);
	expect(kinds.has("imports")).toBe(true);
	expect(kinds.has("touched_by")).toBe(true);
	expect(kinds.has("changed_with")).toBe(true);
});

it("skips history entirely on a rebuild, because HEAD has not moved", async () => {
	const again = await buildGraph({ root: fx.root, service: { fileCap: 50 } });
	expect(again.commitsIndexed).toBe(0);
	expect(again.commitsSkipped).toBe(4);
	expect(again.filesIndexed).toBe(0);
}, 60_000);
