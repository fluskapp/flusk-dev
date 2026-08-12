/**
 * Searching everything that already happened, to build the prompt for what
 * happens next. Frozen contract.
 *
 * The corpus is deliberately mixed — commits, agent sessions, harness runs,
 * skills and docs — because the answer to "how do I do this here" is usually
 * spread across all four. One card shape lets a single ranker see them all.
 *
 * The idea that makes this more than search: we know how past work ENDED.
 * A commit that shipped, a run whose gate passed, a session that was blocked
 * — those outcomes are ranking signal no generic code search has. Verified
 * precedent is what you want to copy; failures are what you want warned about.
 */

export type CardKind = "commit" | "session" | "journal" | "doc" | "skill";

/** How a piece of past work ended — the ranking signal, and the warning. */
export type Outcome = "verified" | "shipped" | "failed" | "blocked" | "unknown";

export interface HistoryCard {
	/** Stable across rebuilds: "commit:<project>:<sha>", "session:<key>", … */
	id: string;
	kind: CardKind;
	project: string;
	title: string;
	/** Searchable body: already secret-scrubbed and length-capped. */
	text: string;
	at: string;
	/** Files this touched (commit/session/journal) or lives at (doc/skill). */
	paths: string[];
	outcome: Outcome;
	/** How to open it: a sha, a session key, a journal path, a file path. */
	ref: string;
}

export interface ScoreParts {
	lexical: number;
	recency: number;
	outcome: number;
	path: number;
	fuzzy: number;
}

export interface SearchHit {
	card: HistoryCard;
	score: number;
	/** Score breakdown, so a ranking can be argued with rather than trusted. */
	why: ScoreParts;
	/** Matched terms, for highlighting. */
	terms: string[];
}

export interface SearchQuery {
	text: string;
	project?: string;
	kinds?: CardKind[];
	/** Bias toward files the task names; extracted by the caller. */
	paths?: string[];
	limit?: number;
}

/**
 * History arranged as a narrative rather than a result list: what was done
 * here before, what was tried and failed, and what the house rules are.
 */
export interface Walkthrough {
	/** Work that shipped or verified in this area — the shape to copy. */
	precedent: SearchHit[];
	/** Previous attempts at this task, especially the ones that did not land. */
	attempts: SearchHit[];
	/** Conventions and gotchas from skills, CLAUDE.md, AGENTS.md. */
	conventions: SearchHit[];
	/** Plain-language warnings derived from failures — the real value. */
	traps: string[];
}

export interface PromptBlock {
	/** Where it came from, shown verbatim so the prompt is auditable. */
	source: string;
	/** Why it was included — the one line that justifies its tokens. */
	why: string;
	text: string;
	tokens: number;
}

export interface ComposedPrompt {
	task: string;
	blocks: PromptBlock[];
	/** Explicit DON'Ts mined from failed attempts. */
	constraints: string[];
	tokens: number;
	/** How many candidate blocks lost out to the budget. */
	omitted: number;
}

export interface HistoryIndex {
	cards: HistoryCard[];
	builtAt: string;
	/** Source fingerprints (git oid, file mtime) for incremental rebuilds. */
	stamps: Record<string, string>;
}
