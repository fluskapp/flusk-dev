/**
 * The essentials, reserved out of the budget before anything is ranked.
 *
 * House rules and the verify chain are not entrants in a relevance contest.
 * A hundred loud commits must not be able to crowd out the one document that
 * says how this repo is verified, and no score, however high, may displace
 * one — which is exactly what `composePrompt` already does with its
 * constraints, so the shape is copied rather than reinvented: take the
 * reserved set first, at whatever it costs, and pack the rest into what is
 * left.
 *
 * If the pinned set alone overruns the budget the pinned items still ship,
 * trimmed at a boundary (invariant 10) — a run that knows two thirds of its
 * house rules and nothing else is in better shape than one that knows the
 * fourth-ranked commit. The trim is reported to the caller, which files it as
 * a note on the source, because an item that IS in the block cannot also be
 * an omission without breaking the "no third fate" count.
 */
import { budgetOmission } from "./omit.js";
import { block, type Rendered, reframe } from "./render.js";
import type { ContextItem, Omission } from "./types.js";

export interface Pinned {
	blocks: Rendered[];
	omitted: Omission[];
	/** Trims, to be filed as notes on the owning source's outcome. */
	notes: { source: string; note: string }[];
	tokens: number;
}

/**
 * `items` arrive in reading order and are taken in it: when the budget runs
 * out mid-list, what survives is the head of a stable order rather than
 * whichever items a sort happened to favour this time (L5).
 */
export function pinBlocks(
	items: readonly ContextItem[],
	label: (source: string) => string,
	room: number,
): Pinned {
	const blocks: Rendered[] = [];
	const omitted: Omission[] = [];
	const notes: { source: string; note: string }[] = [];
	let used = 0;
	for (const item of items) {
		const left = room - used;
		// Rank is 0 for every pinned item and is never printed (invariant 11).
		const full = block(item, label(item.source), 0);
		if (full.item.tokens <= left) {
			blocks.push(full);
			used += full.item.tokens;
			continue;
		}
		const cut = left <= 0 ? null : reframe(item, label(item.source), 0, left * 4);
		if (cut === null) {
			omitted.push(budgetOmission(item, full.item.tokens, left));
			continue;
		}
		blocks.push(cut);
		used += cut.item.tokens;
		notes.push({
			source: item.source,
			note: `${item.title} was trimmed at a line boundary from ${full.item.tokens} to ${cut.item.tokens} tokens: the pinned set alone did not fit the ${room}-token reservation.`,
		});
	}
	return { blocks, omitted, notes, tokens: used };
}
