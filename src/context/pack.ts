/**
 * The ranked remainder, spent — in two passes, so a floor means something.
 *
 * Pass one gives every source its floor (src/context/floors.ts) to fill on its
 * own; pass two throws everything still unspent into one contest for what is
 * left. Without pass one the source with the most candidates wins every slot;
 * without pass two the block is a fixed pie chart that ignores the task.
 *
 * `packToBudget` from src/history/budget.ts does the choosing in both passes.
 * It maximises value PER TOKEN — a 40-token rule that changes how everything
 * else is read beats a 900-token diff that is merely relevant — and a second
 * packer beside it would eventually disagree with it about the same items.
 *
 * The one thing not delegated is trimming. `packToBudget` trims the text it
 * was given, and the text it was given is a fenced block: cutting it would
 * take the closing fence with it. So a trimmed result is re-cut through
 * `reframe`, which cuts the body and re-renders the frame — never longer than
 * what the packer allowed, so the ceiling still holds.
 */
import { type Candidate, packToBudget } from "../history/budget.js";
import { floorFor } from "./floors.js";
import { byRank, type Ranker } from "./normalise.js";
import { budgetOmission } from "./omit.js";
import { block, type Rendered, reframe } from "./render.js";
import type { ContextItem, Omission } from "./types.js";

interface Cand extends Candidate {
	item: ContextItem;
	rendered: Rendered;
}

export interface Packed {
	blocks: Rendered[];
	omitted: Omission[];
	tokens: number;
}

export interface PackInput {
	/** Diversified ranked candidates. */
	items: readonly ContextItem[];
	rank: Ranker;
	label: (source: string) => string;
	/** What is left after the preamble and the pinned reservation. */
	budget: number;
}

const cand = (item: ContextItem, inp: PackInput): Cand => {
	const rendered = block(item, inp.label(item.source), inp.rank(item));
	return { item, rendered, text: rendered.chunk, value: inp.rank(item) };
};

/** One pass of the packer, with the trim repaired back inside its frame. */
function pass(cands: Cand[], budget: number, inp: PackInput): { blocks: Rendered[]; used: number } {
	const blocks: Rendered[] = [];
	let used = 0;
	if (budget <= 0) return { blocks, used };
	for (const kept of packToBudget(cands, budget).kept) {
		const c = kept.item;
		const whole = kept.text === c.text;
		const fitted = whole
			? c.rendered
			: reframe(c.item, inp.label(c.item.source), inp.rank(c.item), kept.text.length);
		if (fitted === null) continue;
		blocks.push(fitted);
		used += fitted.item.tokens;
	}
	return { blocks, used };
}

/**
 * Sources take their floors strongest-first, so when the whole budget is
 * smaller than the floors put together the room goes where the best-ranked
 * material is rather than wherever the alphabet points. Ties break on the
 * source id (L5).
 */
function sourceOrder(cands: readonly Cand[]): string[] {
	const best = new Map<string, number>();
	for (const c of cands) best.set(c.item.source, Math.max(best.get(c.item.source) ?? 0, c.value));
	return [...best.entries()]
		.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
		.map(([source]) => source);
}

/** Floors first, then one open contest for the remainder, then the omissions. */
export function packRanked(inp: PackInput): Packed {
	const cands = [...inp.items].sort(byRank(inp.rank)).map((item) => cand(item, inp));
	const blocks: Rendered[] = [];
	const taken = new Set<string>();
	let used = 0;
	for (const source of sourceOrder(cands)) {
		const mine = cands.filter((c) => c.item.source === source && !taken.has(c.item.id));
		const room = Math.min(floorFor(source, inp.budget), inp.budget - used);
		const got = pass(mine, room, inp);
		for (const b of got.blocks) {
			blocks.push(b);
			taken.add(b.item.id);
		}
		used += got.used;
	}
	const rest = cands.filter((c) => !taken.has(c.item.id));
	const open = pass(rest, inp.budget - used, inp);
	for (const b of open.blocks) {
		blocks.push(b);
		taken.add(b.item.id);
	}
	used += open.used;
	const omitted = cands
		.filter((c) => !taken.has(c.item.id))
		.map((c) => budgetOmission(c.item, c.rendered.item.tokens, inp.budget - used));
	return { blocks, omitted, tokens: used };
}
