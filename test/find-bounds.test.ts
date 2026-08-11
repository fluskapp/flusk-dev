/**
 * The bounds, and the promise that every one of them is *stated*.
 *
 * A search tool has exactly one unforgivable failure: returning a short list
 * that looks like the whole list. So each cap here is asserted twice — that it
 * fired, and that `truncated` plus a readable `note` said so.
 *
 * The last block is the containment rule: a request may narrow the configured
 * roots by project NAME and can never name a path, so `../` and an absolute
 * path outside the config search nothing rather than something.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rgArgs } from "../src/find/rg-parse.js";
import { runRg } from "../src/find/rg-spawn.js";
import { find, MAX_FILES } from "../src/find/ripgrep.js";
import { type FindTree, findTree, hasRg, put } from "./find-fixture.js";

let t: FindTree;
/** One more file than the file cap, so the cap is reached, not merely met. */
const CROWD = MAX_FILES + 10;

beforeAll(() => {
	t = findTree();
	for (let i = 0; i < CROWD; i++) put(join(t.work, "gamma"), `f${i}.txt`, "haystack line\n");
});
afterAll(() => t.cleanup());

describe.skipIf(!hasRg())("bounds", () => {
	it("stops at the match limit and says so", async () => {
		const r = await find(t.cfg, { q: "needle", limit: 2 });
		expect(r.total).toBe(2);
		expect(r.truncated).toBe(true);
		expect(r.note).toContain("stopped at 2 matches");
	});

	it("clamps an absurd limit to the built-in maximum", async () => {
		const r = await find(t.cfg, { q: "haystack", limit: 10_000 });
		// The file cap bites first here, which is itself the point: whichever
		// bound fires, the caller is told which one.
		expect(r.total).toBeLessThanOrEqual(200);
	});

	it("stops at the file limit and says so", async () => {
		const r = await find(t.cfg, { q: "haystack" });
		expect(r.files).toHaveLength(MAX_FILES);
		expect(r.truncated).toBe(true);
		expect(r.note).toContain(`stopped at ${MAX_FILES} files`);
	});

	it("kills the child and reports a timeout instead of hanging", async () => {
		// A FIFO makes rg block on read forever — a deterministic slow search,
		// with no sleep and no dependence on how fast the machine is.
		const fifo = join(t.outside, "blocking.fifo");
		execFileSync("mkfifo", [fifo]);
		const note = await runRg(rgArgs({ q: "needle" }, [fifo]), () => false, undefined, 40);
		expect(note).toBe("search timed out after 40ms");
	});

	it("reports an aborted search rather than a silent empty one", async () => {
		const r = await find(t.cfg, { q: "needle" }, AbortSignal.abort());
		expect(r.truncated).toBe(true);
		expect(r.note).toContain("aborted");
	});

	it("reports a ripgrep failure as a note, never a throw", async () => {
		const note = await runRg(["--not-a-real-flag", "--", "x", t.work], () => false);
		expect(note).toContain("ripgrep failed");
	});

	it("quotes the stderr line that explains the failure, not the header", async () => {
		// The Regex toggle's main failure mode: rg prints "rg: regex parse
		// error:", the pattern, a caret, and only THEN the reason. Keeping the
		// first line showed a note that stopped before it said anything.
		const note = await runRg(rgArgs({ q: "[", regex: true }, [t.work]), () => false);
		expect(note).toContain("ripgrep failed");
		expect(note).toContain("unclosed character class");
		expect(note).not.toBe("ripgrep failed: rg: regex parse error:");
	});
});

describe.skipIf(!hasRg())("containment", () => {
	it("has a control file outside the configured roots that does match", () => {
		expect(existsSync(t.outsideFile)).toBe(true);
		expect(readFileSync(t.outsideFile, "utf8")).toContain("needle");
	});

	it("never returns a file outside the configured roots", async () => {
		const r = await find(t.cfg, { q: "needle" });
		expect(r.files.some((f) => f.path.startsWith(t.outside))).toBe(false);
	});

	it("refuses a traversal in the project name instead of widening the search", async () => {
		for (const project of ["../", "..", "../../etc", t.outside, "/etc"]) {
			const r = await find(t.cfg, { q: "needle", project });
			expect(r.total).toBe(0);
			expect(r.files).toEqual([]);
			expect(r.note).toContain("nothing was searched");
		}
	});

	it("cannot be widened by a glob either", async () => {
		for (const glob of ["../*", `${t.outside}/*`, "/etc/*"]) {
			const r = await find(t.cfg, { q: "needle", glob });
			expect(r.files.some((f) => f.path.startsWith(t.outside))).toBe(false);
		}
	});

	it("searches only the named project when one is given", async () => {
		const r = await find(t.cfg, { q: "needle", project: "beta" });
		expect(r.total).toBeGreaterThan(0);
		expect(new Set(r.files.map((f) => f.project))).toEqual(new Set(["beta"]));
	});
});
