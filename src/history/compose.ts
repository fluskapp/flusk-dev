/**
 * The walkthrough, spent as a prompt.
 *
 * Order is the argument: conventions come BEFORE precedent because a house
 * rule changes how every following block is read, and a precedent read under
 * the wrong rules is a trap of its own. Precedent is capped at one or two —
 * the third example teaches nothing the first two did not, and it costs a
 * thousand tokens to say so.
 *
 * Constraints are reserved out of the budget before any block is packed. They
 * are the one output that cannot be re-derived by the model from context: a
 * DON'T with a citation. Losing a diff to the budget costs quality; losing the
 * warning that the gate already blocked this approach costs the whole run.
 *
 * Pure retrieval, top to bottom — no model call, no network, no I/O.
 */
import { type Candidate, estimateTokens, packToBudget } from "./budget.js";
import { refLabel } from "./citation.js";
import { isHouseRule } from "./sections.js";
import type { ComposedPrompt, HistoryCard, PromptBlock, SearchHit, Walkthrough } from "./types.js";

/** The shape `trapLine` writes; the seam a constraint is derived across. */
const TRIED = 'Tried "';
const SEP = " — ";

interface Block extends Candidate {
	source: string;
	why: string;
	/** Position in the canonical reading order; packing may reorder. */
	order: number;
}

/**
 * A trap says what happened; a constraint says what to do about it. The
 * citation is carried through untouched — an instruction the reader cannot
 * check is worth less than no instruction.
 */
export function constraintFrom(trap: string): string {
	const at = trap.lastIndexOf(SEP);
	if (!trap.startsWith(TRIED) || at <= TRIED.length) return `Do not repeat this — ${trap}`;
	const what = trap.slice(TRIED.length - 1, at);
	return `Do not retry ${what} the same way — a previous run did and ${trap.slice(at + SEP.length)}`;
}

/** Title plus body, without repeating the title when the body opens with it. */
function body(card: HistoryCard): string {
	const title = card.title.trim();
	const text = card.text.trim();
	if (text === "") return title;
	return text.startsWith(title) ? text : `${title}\n${text}`;
}

const ended = (h: SearchHit): string =>
	h.card.outcome === "unknown" ? "outcome unrecorded" : `it ended ${h.card.outcome}`;

function candidates(w: Walkthrough, task: string): Block[] {
	const out: Block[] = [];
	const add = (source: string, why: string, text: string, value: number, req = false): void => {
		if (text.trim() === "") return;
		out.push({ source, why, text, value, order: out.length, ...(req ? { required: true } : {}) });
	};
	add("task", "The work to do; every other block is here to serve it.", task, 1e6, true);
	for (const h of w.conventions) {
		const rule = isHouseRule(h.card);
		// Name the repo the rule belongs to. "this repo" was asserted of every
		// house rule in the corpus, so an unscoped prompt told the reader that
		// four different projects' rules each governed the work in hand.
		const why = rule
			? `House rule for ${h.card.project} — it governs how the rest of this prompt is read.`
			: `Convention that covers this area (${h.card.title}).`;
		add(refLabel(h.card), why, body(h.card), rule ? 200 : 120);
	}
	w.precedent.slice(0, 2).forEach((h, i) => {
		add(
			refLabel(h.card),
			`Work here that ${h.card.outcome} — the shape to copy.`,
			body(h.card),
			90 - i,
		);
	});
	w.attempts.forEach((h, i) => {
		add(
			refLabel(h.card),
			`A previous attempt at this same task — ${ended(h)}.`,
			body(h.card),
			60 - i,
		);
	});
	w.precedent.slice(2).forEach((h) => {
		add(refLabel(h.card), "Supporting context: further precedent in this area.", body(h.card), 20);
	});
	return out;
}

export interface ComposeOptions {
	budget: number;
}

/**
 * Blocks in decreasing usefulness, trimmed to the budget. The task block is
 * `required`, so an absurdly small budget yields a prompt that is only the
 * task rather than an empty one; `tokens` always reports what was really
 * spent, including the reserved constraints.
 */
export function composePrompt(w: Walkthrough, task: string, opts: ComposeOptions): ComposedPrompt {
	const constraints = w.traps.map(constraintFrom);
	const reserved = constraints.reduce((n, c) => n + estimateTokens(c), 0);
	const packed = packToBudget(candidates(w, task), Math.max(0, opts.budget - reserved));
	const blocks: PromptBlock[] = [...packed.kept]
		.sort((a, b) => a.item.order - b.item.order)
		.map((k) => ({ source: k.item.source, why: k.item.why, text: k.text, tokens: k.tokens }));
	return { task, blocks, constraints, tokens: reserved + packed.tokens, omitted: packed.omitted };
}
