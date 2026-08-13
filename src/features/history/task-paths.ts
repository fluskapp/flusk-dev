/**
 * The files a task names, and how much they are allowed to mean.
 *
 * A path in the task is the strongest cheap signal there is — "fix the retry in
 * src/watch/tick.ts" says which card is wanted more clearly than any word does.
 * A bare FILENAME is the same signal only while it is rare. `CHANGELOG.md`
 * appears in 416 of the real corpus's 2641 cards, `README.md` in 157,
 * `package.json` in 153: naming one of those promotes a sixth of the index and
 * pushes the best lexical answer off the page (measured: rank 1 -> rank 23).
 *
 * So a bare filename counts as a path filter only when the corpus makes it
 * discriminating. A full path, which the user typed in full, always counts.
 */
import { basename } from "node:path";
import type { HistoryCard } from "./types.js";

/** All this module needs: the cards. A Bm25Index and a HistorySearcher both fit. */
export interface HasCards {
	cards: HistoryCard[];
}

const PATHISH = /\b[\w.-]+(?:\/[\w.-]+)+\.[a-z][a-z0-9]{0,5}\b/g;
const FILEISH = /\b[\w-]+\.[a-z][a-z0-9]{0,5}\b/g;
/** Above both bars a basename is not a filter, it is a description of the corpus. */
const COMMON = { share: 0.02, count: 20 };

const nameCache = new WeakMap<HasCards, Map<string, number>>();

/** How many cards each basename appears in, built once per index. */
function nameCounts(index: HasCards): Map<string, number> {
	const cached = nameCache.get(index);
	if (cached !== undefined) return cached;
	const counts = new Map<string, number>();
	for (const card of index.cards) {
		const seen = new Set<string>();
		for (const p of card.paths) seen.add(basename(p).toLowerCase());
		for (const name of seen) counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	nameCache.set(index, counts);
	return counts;
}

/**
 * Paths the task names. A bare filename ("tick.ts") only counts when the
 * corpus actually has one — otherwise "e.g." and "v1.2" become path filters —
 * and only while it is rare enough to point somewhere.
 */
export function extractPaths(index: HasCards, task: string): string[] {
	const out: string[] = [];
	for (const m of task.matchAll(PATHISH)) if (!out.includes(m[0])) out.push(m[0]);
	const counts = nameCounts(index);
	const total = Math.max(1, index.cards.length);
	for (const m of task.matchAll(FILEISH)) {
		const name = m[0];
		const hits = counts.get(name.toLowerCase()) ?? 0;
		if (hits === 0) continue;
		if (hits > COMMON.count && hits / total > COMMON.share) continue;
		if (!out.some((p) => p === name || p.endsWith(`/${name}`))) out.push(name);
	}
	return out;
}
