/**
 * Fetched pages on disk, under the flusk home.
 *
 * Reopening the tab you left open must not hit the network again: it is slow,
 * it is a second request the site did not ask for, and it makes reading docs
 * offline impossible. So a page is written once and served from here, with
 * its fetch time carried alongside — the panel says how old the copy is
 * rather than pretending it is live.
 *
 * Where it writes is not negotiable: the name is a hash (a URL is not a
 * filename — it has slashes, query strings and `..`) and the resulting path
 * still goes through the repo's one path-jail before anything is written.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveWithin } from "../safety/paths.repository.js";
import { fluskHome } from "../../platform/paths/paths.js";
import type { FetchedPage } from "./types.js";

/** Enough of the list to be a reading history, not a database. */
const MAX_LISTED = 200;

export function webCacheDir(): string {
	return join(fluskHome(), "web");
}

export function cachePath(url: string): string {
	const name = `${createHash("sha256").update(url).digest("hex").slice(0, 40)}.json`;
	return resolveWithin([fluskHome()], join(webCacheDir(), name), fluskHome());
}

/** A hand-edited or truncated cache file is a miss, never a crash. */
function asPage(raw: unknown): FetchedPage | null {
	if (typeof raw !== "object" || raw === null) return null;
	const { url, finalUrl, title, markdown, fetchedAt } = raw as Record<string, unknown>;
	const strings = [url, finalUrl, title, markdown, fetchedAt];
	if (strings.some((v) => typeof v !== "string")) return null;
	return raw as unknown as FetchedPage;
}

export function readCached(url: string): FetchedPage | null {
	try {
		return asPage(JSON.parse(readFileSync(cachePath(url), "utf8")) as unknown);
	} catch {
		return null;
	}
}

/** Returns the reason it could not be cached, or null. Never throws. */
export function writeCached(page: FetchedPage): string | null {
	try {
		mkdirSync(webCacheDir(), { recursive: true });
		writeFileSync(cachePath(page.url), JSON.stringify(page), "utf8");
		return null;
	} catch (e) {
		return e instanceof Error ? e.message : String(e);
	}
}

/** Every cached page, newest first, without the bodies. */
export function listCached(): Array<Omit<FetchedPage, "markdown">> {
	let names: string[];
	try {
		names = readdirSync(webCacheDir()).filter((n) => n.endsWith(".json"));
	} catch {
		return [];
	}
	const out: Array<Omit<FetchedPage, "markdown">> = [];
	for (const name of names.slice(0, MAX_LISTED)) {
		try {
			const page = asPage(JSON.parse(readFileSync(join(webCacheDir(), name), "utf8")));
			if (page !== null) {
				const { markdown: _drop, ...head } = page;
				out.push(head);
			}
		} catch {
			// one unreadable file is not an unreadable history
		}
	}
	return out.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
}
