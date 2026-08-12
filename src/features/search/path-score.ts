/**
 * The fuzzy path match that turns "uicli" into `src/ui/client-list.ts`.
 *
 * Split from files.ts, which owns the roots and the listings: this half is
 * pure string work over paths a caller already has, so it is testable with no
 * repo, no ripgrep and no config.
 */

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
