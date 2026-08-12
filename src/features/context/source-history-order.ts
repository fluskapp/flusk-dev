/**
 * The four walkthrough sections joined into one ordered, deduplicated list —
 * and the count of what fell out on the way, because a card that produced no
 * item has to be reported rather than simply not appear (L2).
 *
 * Deduplication is not tidiness. `precedent` and `attempts` are different
 * questions over overlapping kinds, so a verified session is legitimately both
 * "work here that landed" and "a run at this same task", and emitting it twice
 * would double-count its tokens against the budget and hand the assembler two
 * items with the same id. First writer wins in the order that says the most:
 * a previous attempt at THIS task is the stronger claim, so it is built first
 * and keeps the card.
 */
import type { Walkthrough } from "../history/types.js";
import {
	attemptItems,
	conventionItems,
	precedentItems,
	trapsItem,
} from "./source-history-items.js";
import type { ContextItem } from "./types.js";

export interface Assembled {
	items: ContextItem[];
	/**
	 * Cards that ranked but yielded nothing renderable — a commit whose whole
	 * body was a credential, a doc that was blank after trimming. The source
	 * turns this into a note; silence would look identical to never having
	 * found them.
	 */
	dropped: number;
}

const TRAPS_ID = "history:traps";

/**
 * Pinned first, in a fixed reading order: house rules, then the failures they
 * should be read against. Pinned items are NEVER sorted by `score` — it is
 * defined as meaningless for them (invariant 11) — so their order comes from
 * `id`, which is stable across rebuilds. Ranked items sort by score with `id`
 * breaking every tie, so an unrelated commit entering the corpus cannot
 * permute a block that has nothing to do with it (L5).
 */
export function orderItems(items: readonly ContextItem[]): ContextItem[] {
	const pinned = items.filter((i) => i.tier === "pinned" && i.id !== TRAPS_ID);
	const ranked = items.filter((i) => i.tier === "ranked");
	pinned.sort((a, b) => a.id.localeCompare(b.id));
	ranked.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
	return [...pinned, ...items.filter((i) => i.id === TRAPS_ID), ...ranked];
}

export function sectionItems(w: Walkthrough, project: string, isResume: boolean): Assembled {
	const traps = trapsItem(w.traps, project);
	const built = [
		...attemptItems(w.attempts, isResume),
		...precedentItems(w.precedent),
		...conventionItems(w.conventions),
	];
	const kept = new Map<string, ContextItem>();
	for (const item of built) if (!kept.has(item.id)) kept.set(item.id, item);
	const ranked = new Set<string>();
	for (const hit of [...w.attempts, ...w.precedent, ...w.conventions]) ranked.add(hit.card.id);
	const items = [...kept.values(), ...(traps === null ? [] : [traps])];
	return { items: orderItems(items), dropped: ranked.size - kept.size };
}
