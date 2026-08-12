/**
 * A lost item, turned into something a reader can see (L2).
 *
 * A builder that quietly truncates is indistinguishable from one that found
 * nothing: both hand back a short block, and the failure only surfaces later
 * as the agent not knowing something it should have. So every gathered item
 * that does not reach the text leaves a value behind saying which item it was
 * and what happened to it — with numbers, because "did not fit" and "needed
 * 800 tokens, 120 left" lead to different fixes.
 *
 * The constructors here are the only ways an item may be lost. Anything else
 * dropping an item is a bug, not a policy.
 */
import type { ContextItem, Omission } from "./types.js";

const base = (item: ContextItem, tokens: number): Omit<Omission, "reason" | "note"> => ({
	id: item.id,
	source: item.source,
	title: item.title,
	tokens,
	...(item.path === undefined ? {} : { path: item.path }),
});

/** Lost to the ceiling. `left` is what remained when it was considered. */
export const budgetOmission = (item: ContextItem, need: number, left: number): Omission => ({
	...base(item, need),
	reason: "budget",
	note: `needed ${need} tokens, ${Math.max(0, left)} left in the budget`,
});

/** Lost to MMR: it restated what its own source had already said better. */
export const duplicateOmission = (item: ContextItem, cap: number): Omission => ({
	...base(item, item.tokens),
	reason: "duplicate",
	note: `MMR (src/history/diverse.ts) ranked it below the ${cap} blocks already taken from "${item.source}" for saying the most per token`,
});

/**
 * Two sources claimed one id. Ids are the audit trail's primary key, so the
 * second is dropped rather than allowed to shadow the first in a lookup.
 */
export const collisionOmission = (item: ContextItem, first: string): Omission => ({
	...base(item, item.tokens),
	reason: "duplicate",
	note: `its id is already used by an item from "${first}"; ids must be unique across sources, so this one was not rendered`,
});

/** The same rules document, offered a second time by a second source. */
export const sameFileOmission = (item: ContextItem, first: string): Omission => ({
	...base(item, item.tokens),
	reason: "duplicate",
	note: `"${first}" already quotes ${item.path ?? "this file"}; one file is quoted once, or the block pays for it twice`,
});

/** Nothing left to quote once redaction and trimming had run. */
export const emptyOmission = (item: ContextItem): Omission => ({
	...base(item, item.tokens),
	reason: "empty",
	note: "its body was empty after the source redacted and trimmed it, so it carries nothing to quote",
});
