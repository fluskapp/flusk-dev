/**
 * The roots every search is allowed to touch and the files inside them. (The
 * fuzzy path match lives beside it in path-score.ts, re-exported here.)
 *
 * Two things are load-bearing here:
 *
 *  - Roots come from `projectRoots(cfg)` — the same expansion the rest of the
 *    dashboard uses — and a request may only NARROW them by project name. It
 *    can never name a directory, so there is no path for `../` or an absolute
 *    path to widen what gets read.
 *  - The listing is `rg --files`, not a hand-rolled walk, because that is what
 *    makes it respect .gitignore: a walk would offer node_modules and dist,
 *    which is the difference between a usable Go-to-File and a useless one.
 */
import { basename, resolve } from "node:path";
import type { AhConfig } from "../config/types.js";
import { projectRoots } from "../ui/project-scan.js";
import { rgFiles } from "./rg-list.js";

/** Paths kept per root. A monorepo can list far more; nobody scrolls them. */
const MAX_FILES = 20_000;
/** Long enough that typing in the palette costs one `rg --files`, not many. */
const TTL_MS = 5_000;

export interface FindRoot {
	/** Absolute project root. */
	path: string;
	/** Its directory name — the handle `?project=` filters on. */
	project: string;
}

/**
 * The roots this query may search. An unknown project name yields an EMPTY
 * list, never every root: falling back to "search everything" would turn a
 * typo — or `?project=../` — into a wider read than was asked for.
 */
export function searchRoots(cfg: AhConfig, project?: string): FindRoot[] {
	const roots = projectRoots(cfg).map((path) => ({ path, project: basename(path) || path }));
	if (project === undefined || project === "") return roots;
	return roots.filter((r) => r.project === project);
}

/** Which root a path came from, for display. */
export function projectFor(roots: FindRoot[], path: string): string {
	const found = roots.find((r) => path === r.path || path.startsWith(`${r.path}/`));
	return found?.project ?? "";
}

interface Listing {
	at: number;
	files: string[];
	/** The same paths, resolved, for membership tests. Built once per walk. */
	set: Set<string>;
}

const cache = new Map<string, Listing>();
/** One walk per root at a time: a burst of keystrokes must not fan out into N. */
const inflight = new Map<string, Promise<Listing>>();

/** One root's tracked files, cached briefly — the palette calls this per keystroke. */
async function listingUnder(root: string): Promise<Listing> {
	const hit = cache.get(root);
	if (hit !== undefined && Date.now() - hit.at < TTL_MS) return hit;
	const running = inflight.get(root);
	if (running !== undefined) return running;
	const walk = rgFiles(root)
		.then((files) => {
			const listing = { at: Date.now(), files, set: new Set(files.map((f) => resolve(f))) };
			cache.set(root, listing);
			return listing;
		})
		.finally(() => inflight.delete(root));
	inflight.set(root, walk);
	return walk;
}

async function filesUnder(root: string): Promise<string[]> {
	return (await listingUnder(root)).files;
}

/**
 * Is `path` one of the files ah indexes? The membership test every endpoint
 * that serves a file body runs before it opens anything.
 *
 * PER ROOT, deliberately. Testing against `listFiles(cfg)` meant testing
 * against a list capped at MAX_FILES and filled root-first, so one large repo
 * sorting first made every file in every LATER project "not an indexed file".
 * Resolving the owning root first also turns an O(n) scan of 20,000 strings
 * into a Set lookup, on a path the doc panel hits three times per click.
 */
export async function isIndexedFile(cfg: AhConfig, path: string): Promise<boolean> {
	const target = resolve(path);
	const root = searchRoots(cfg).find((r) => target === r.path || target.startsWith(`${r.path}/`));
	if (root === undefined) return false;
	return (await listingUnder(root.path)).set.has(target);
}

export interface ListOptions {
	project?: string;
	limit?: number;
}

/** Every tracked file under the allowed roots, absolute, capped. */
export async function listFiles(cfg: AhConfig, options: ListOptions = {}): Promise<string[]> {
	const cap = Math.max(1, Math.min(options.limit ?? MAX_FILES, MAX_FILES));
	const out: string[] = [];
	for (const root of searchRoots(cfg, options.project)) {
		for (const file of await filesUnder(root.path)) {
			out.push(resolve(file));
			if (out.length >= cap) return out;
		}
	}
	return out;
}

export { fuzzyPath } from "./path-score.js";
