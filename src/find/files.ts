/**
 * The roots every search is allowed to touch, the files inside them, and the
 * fuzzy path match that turns "uicli" into `src/ui/client-list.ts`.
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

const cache = new Map<string, { at: number; files: string[] }>();
/** One walk per root at a time: a burst of keystrokes must not fan out into N. */
const inflight = new Map<string, Promise<string[]>>();

/** One root's tracked files, cached briefly — the palette calls this per keystroke. */
async function filesUnder(root: string): Promise<string[]> {
	const hit = cache.get(root);
	if (hit !== undefined && Date.now() - hit.at < TTL_MS) return hit.files;
	const running = inflight.get(root);
	if (running !== undefined) return running;
	const walk = rgFiles(root)
		.then((files) => {
			cache.set(root, { at: Date.now(), files });
			return files;
		})
		.finally(() => inflight.delete(root));
	inflight.set(root, walk);
	return walk;
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

/** A new segment starts here, which is where humans abbreviate. */
const BOUNDARY = new Set(["/", "-", "_", ".", " "]);

/** Greedy subsequence score over `text` from `from`, or null when it misses. */
function score(text: string, q: string, from: number): number | null {
	let cursor = from;
	let total = 0;
	let last = -2;
	for (const ch of q) {
		const at = text.indexOf(ch, cursor);
		if (at === -1) return null;
		total += 1;
		if (at === 0 || BOUNDARY.has(text[at - 1] ?? "")) total += 4;
		if (at === last + 1) total += 3;
		last = at;
		cursor = at + 1;
	}
	return total;
}

/**
 * Score for one path: the best of the whole-path match and a match confined to
 * the basename, with the basename preferred. "Go to file" is a question about
 * the FILE — the directories are context — so `client-list.ts` must beat a
 * long path that merely happens to spell the letters out across segments.
 */
function scorePath(path: string, q: string): number | null {
	const lower = path.toLowerCase();
	const full = score(lower, q, 0);
	if (full === null) return null;
	const base = score(lower, q, lower.lastIndexOf("/") + 1);
	const best = base === null ? full : Math.max(full, base) + 6;
	return best - lower.length * 0.01; // shorter paths break ties
}

/** Best fuzzy matches for `query`, best first. An empty query is everything. */
export function fuzzyPath(files: string[], query: string, limit = 40): string[] {
	const q = query.replace(/\s+/g, "").toLowerCase();
	if (q === "") return files.slice(0, limit);
	const scored: { path: string; score: number }[] = [];
	for (const path of files) {
		const s = scorePath(path, q);
		if (s !== null) scored.push({ path, score: s });
	}
	scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
	return scored.slice(0, Math.max(0, limit)).map((s) => s.path);
}
