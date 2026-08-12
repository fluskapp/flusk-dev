/**
 * Go-to-File: the tracked-file listing and the fuzzy path match over it.
 *
 * `fuzzyPath` is tested on synthetic relative paths rather than on the temp
 * tree because a scored ranking must be asserted against paths the test
 * controls end to end — an mkdtemp prefix is random text that a subsequence
 * matcher can legitimately match through.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fuzzyPath, listFiles, projectFor, searchRoots } from "../src/features/search/files.js";
import { type FindTree, findTree, hasRg } from "./find-fixture.js";

let t: FindTree;

beforeAll(() => {
	t = findTree();
});
afterAll(() => t.cleanup());

const PATHS = [
	"src/ui/client-list.ts",
	"src/ui/client-chat.ts",
	"src/ui/styles-chat.ts",
	"src/cli/main.ts",
];

it("ranks a segment-boundary subsequence first — IntelliJ's Go-to-File", () => {
	// "uicli" is u-i / c-l-i across two segment starts; main.ts has no `u` at
	// all, and styles-chat runs out of letters, so both are misses, not weak hits.
	expect(fuzzyPath(PATHS, "uicli")).toEqual(["src/ui/client-chat.ts", "src/ui/client-list.ts"]);
	expect(fuzzyPath(PATHS, "uiclientlist")).toEqual(["src/ui/client-list.ts"]);
	expect(fuzzyPath(PATHS, "zzz")).toEqual([]);
});

it("prefers a hit in the basename over one strung across directories", () => {
	expect(fuzzyPath(["client/x/other.ts", "x/client.ts"], "client")[0]).toBe("x/client.ts");
	// And a boundary-aligned basename over the same letters mid-word.
	expect(fuzzyPath(["a/zzclientlist.ts", "a/client-list.ts"], "clientlist")[0]).toBe(
		"a/client-list.ts",
	);
});

it("honours the limit and treats an empty query as 'everything'", () => {
	expect(fuzzyPath(PATHS, "", 2)).toEqual(PATHS.slice(0, 2));
	expect(fuzzyPath(PATHS, "c", 1)).toHaveLength(1);
});

it("resolves roots from the config and refuses an unknown project", () => {
	expect(
		searchRoots(t.cfg)
			.map((r) => r.project)
			.sort(),
	).toEqual(["alpha", "beta"]);
	expect(searchRoots(t.cfg, "alpha")).toHaveLength(1);
	expect(searchRoots(t.cfg, "../")).toEqual([]);
	expect(searchRoots(t.cfg, t.outside)).toEqual([]);
	expect(projectFor(searchRoots(t.cfg), `${t.outside}/secret.txt`)).toBe("");
});

describe.skipIf(!hasRg())("listFiles", () => {
	it("lists every tracked file under the configured roots, absolute", async () => {
		const files = await listFiles(t.cfg);
		expect(files.every((f) => f.startsWith("/"))).toBe(true);
		expect(files.some((f) => f.endsWith("/alpha/src/uni.txt"))).toBe(true);
		expect(files.some((f) => f.endsWith("/beta/lib/two.ts"))).toBe(true);
		expect(files.some((f) => f.startsWith(t.outside))).toBe(false);
	});

	it("narrows to one project and caps the listing", async () => {
		const beta = await listFiles(t.cfg, { project: "beta" });
		expect(beta.every((f) => f.includes("/beta/"))).toBe(true);
		expect(await listFiles(t.cfg, { limit: 1 })).toHaveLength(1);
		expect(await listFiles(t.cfg, { project: "../" })).toEqual([]);
	});

	it("finds a real file by fuzzy path", async () => {
		const hit = fuzzyPath(await listFiles(t.cfg), "unitxt", 5);
		expect(hit[0]?.endsWith("/alpha/src/uni.txt")).toBe(true);
	});
});
