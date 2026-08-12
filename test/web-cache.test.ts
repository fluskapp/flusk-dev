/**
 * The cache round trip on its own: written under the flusk home, read back
 * intact, listed without its bodies, and never crashing on a file somebody
 * edited by hand.
 *
 * The path assertion is the one that is really about safety: a URL is
 * attacker-shaped input, and the name it lands under must be a hash inside
 * the flusk home rather than anything the URL itself chose.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { fluskHome } from "../src/platform/paths/paths.js";
import { cachePath, listCached, readCached, webCacheDir, writeCached } from "../src/features/web/cache.repository.js";
import type { FetchedPage } from "../src/features/web/types.js";

let home: string;

const page = (url: string, at: string): FetchedPage => ({
	url,
	finalUrl: url,
	title: `Title of ${url}`,
	markdown: "# Body\n\nText.",
	fetchedAt: at,
});

beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-webcache-"));
	process.env.FLUSK_HOME = home;
	mkdirSync(join(home, "web"), { recursive: true });
});

afterAll(() => {
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("writes under the flusk home, under a name the URL did not choose", () => {
	const nasty = "https://evil.example/../../../etc/passwd?x=/../y";
	const path = cachePath(nasty);
	// realpath, because the jail resolves symlinks (/var → /private/var here).
	expect(path.startsWith(`${realpathSync(webCacheDir())}/`)).toBe(true);
	expect(path.startsWith(realpathSync(fluskHome()))).toBe(true);
	expect(path).toMatch(/\/[0-9a-f]{40}\.json$/);
	expect(path).not.toContain("passwd");
});

it("round-trips a page and hands the list back newest first", () => {
	expect(writeCached(page("https://a.example/1", "2026-01-01T00:00:00.000Z"))).toBeNull();
	expect(writeCached(page("https://b.example/2", "2026-02-02T00:00:00.000Z"))).toBeNull();
	const back = readCached("https://a.example/1");
	expect(back?.title).toBe("Title of https://a.example/1");
	expect(back?.markdown).toBe("# Body\n\nText.");
	const list = listCached();
	expect(list.map((a) => a.url)).toEqual(["https://b.example/2", "https://a.example/1"]);
	expect(list.every((a) => !("markdown" in a))).toBe(true);
});

it("treats an unreadable entry as a miss, not as a crash", () => {
	writeFileSync(cachePath("https://c.example/3"), "{ not json");
	expect(readCached("https://c.example/3")).toBeNull();
	writeFileSync(cachePath("https://d.example/4"), '{"url":"x"}');
	expect(readCached("https://d.example/4")).toBeNull();
	// and one broken file does not take the reading list with it
	expect(listCached().length).toBe(2);
	expect(readCached("https://never.fetched/")).toBeNull();
});
