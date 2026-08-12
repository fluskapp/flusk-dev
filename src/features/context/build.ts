/**
 * The join: request in, BuiltContext out.
 *
 * Everything a run needs to know before its first turn already exists in this
 * repo — the verify chain it will be judged by, the house rules of the project
 * it is editing, what the history says about the files it is about to touch,
 * what failed here last time — and nothing puts them in one place. This does,
 * in a fixed order, and each step is load-bearing:
 *
 *   1 PIN     rules and the verify chain are reserved out of the budget first,
 *             the way compose.ts reserves constraints. They never compete.
 *   2 RANK    scores arrive on per-source scales; normalise.ts makes them one
 *             number, which is the step where a context builder quietly
 *             becomes all-commits-and-no-code if nobody looks.
 *   3 DIVERSE ten paraphrases of one commit are one fact billed ten times.
 *   4 FLOOR   a source with four hundred candidates does not get the block.
 *   5 PACK    packToBudget, and every loser reported with its reason (L2).
 *   6 RENDER  one shape, delimited and labelled, deterministic (L3, L5).
 *
 * Redaction is NOT a step here. It happened once, inside each source, before
 * the item existed (L4); re-scrubbing at the boundary would be the second
 * redactor the design forbids and would eat the file paths this repo has
 * already been bitten by losing.
 *
 * Called ONCE at run start and once more on resume (L6). The result is stored
 * and reused for every turn: rebuilding per turn thrashes the prompt cache and
 * makes the conversation shift under the model.
 */
import { estimateTokens } from "../history/budget.js";
import { diversify, PER_SOURCE_KEEP } from "./diversify.js";
import { gatherAll } from "./gather.js";
import { byRank, makeRanker } from "./normalise.js";
import { duplicateOmission } from "./omit.js";
import { outcomesOf } from "./outcomes.js";
import { packRanked } from "./pack.js";
import { pinBlocks } from "./pin.js";
import { document, preambleTokens, type Rendered } from "./render.js";
import { defaultSources } from "./sources.js";
import type {
	BuiltContext,
	ContextItem,
	ContextRequest,
	ContextSource,
	Omission,
} from "./types.js";

export interface BuildOptions {
	/** Registration order is the pinned reading order. Defaults to the six. */
	sources?: readonly ContextSource[];
}

/**
 * Pinned reading order: the source's position in the registry, then `id`.
 * Discovery order never reaches the output, so adding a source cannot permute
 * the blocks of the sources around it (invariant 12).
 */
function pinnedOrder(items: readonly ContextItem[], rank: readonly string[]): ContextItem[] {
	const at = (s: string): number => {
		const i = rank.indexOf(s);
		return i < 0 ? rank.length : i;
	};
	return [...items].sort(
		(a, b) => at(a.source) - at(b.source) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
	);
}

export function buildContext(req: ContextRequest, opts: BuildOptions = {}): BuiltContext {
	const sources = opts.sources ?? defaultSources();
	const labels = new Map(sources.map((s) => [s.id, s.label]));
	const label = (id: string): string => labels.get(id) ?? id;
	const gathered = gatherAll(sources, req);
	const omitted: Omission[] = [...gathered.omitted];

	// The preamble is spent before any item is: it is what tells a reader, and
	// the model, that the fenced text below is data rather than orders.
	const room = req.budgetTokens - preambleTokens();
	const rank = makeRanker(gathered.items);

	const pinned = pinBlocks(
		pinnedOrder(
			gathered.items.filter((i) => i.tier === "pinned"),
			sources.map((s) => s.id),
		),
		label,
		room,
	);
	omitted.push(...pinned.omitted);

	const { kept, dropped } = diversify(
		gathered.items.filter((i) => i.tier === "ranked"),
		rank,
	);
	omitted.push(...dropped.map((i) => duplicateOmission(i, PER_SOURCE_KEEP)));

	const packed = packRanked({ items: kept, rank, label, budget: room - pinned.tokens });
	omitted.push(...packed.omitted);

	// Canonical reading order: the reserved essentials, then the ranked blocks
	// by the score they were selected on — not by the order MMR walked them in.
	const order = byRank(rank);
	const blocks: Rendered[] = [
		...pinned.blocks,
		...[...packed.blocks].sort((a, b) => order(a.item, b.item)),
	];
	const included = blocks.map((b) => b.item);
	const text = document(blocks.map((b) => b.chunk));
	return {
		text,
		included,
		omitted,
		tokens: estimateTokens(text),
		budget: req.budgetTokens,
		outcomes: outcomesOf(gathered.runs, included, pinned.notes),
	};
}
