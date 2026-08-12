/**
 * What a run is allowed to know before its first turn. Frozen contract.
 *
 * The memory layer that used to recall context at run start went out with
 * abagraph. What is left is a system prompt, the workspace files and an env
 * block — so a run today does not know the verify chain it will be judged by,
 * the house rules of the repo it is editing, what the history says about the
 * files it is about to touch, or what already failed here last time. Every one
 * of those facts is present in this repo (src/history, src/profile,
 * src/agent/workspace.ts); nothing joins them. This module is the join.
 *
 * Types only. The implementation reuses estimateTokens/packToBudget, search,
 * selectDiverse, refLabel and redact: a second estimator, ranker, redactor or
 * packer is a defect — two will disagree, and nobody watches the wrong one.
 *
 * PINNED vs RANKED is the load-bearing distinction. House rules and the verify
 * chain are not entrants in a relevance contest — they are reserved out of the
 * budget first, the way compose.ts already reserves constraints, so a hundred
 * loud commits cannot crowd out the one document that says how this repo is
 * verified. Ranked items compete for what is left.
 */

/** Reserved before packing (rules, verify chain) vs competing for the remainder. */
export type ContextTier = "pinned" | "ranked";

/** Stable source id: "workspace", "verify", "profile", "history", "runs". */
export type ContextSourceId = string;

export interface ContextRequest {
	/** The task text, verbatim. The only thing every item is selected against. */
	task: string;
	/** Absolute repo root. The one path here that is not repo-relative. */
	repoRoot: string;
	/** Ceiling for the WHOLE block, pinned items included. Never exceeded. */
	budgetTokens: number;
	/**
	 * A resume rebuilds the snapshot (L6): the tree and the run's own journal
	 * have moved. Sources may weight differently, never non-deterministically.
	 */
	isResume: boolean;
	/** Repo-relative paths the task already names, for path-biased ranking. */
	paths?: string[];
}

export interface ContextItem {
	/** Deterministic and stable across rebuilds: "history:commit:<repo>:<sha>". */
	id: string;
	source: ContextSourceId;
	/** One line, shown as the block heading. */
	title: string;
	/**
	 * Gathered text, already through redact(). Rendered as DELIMITED, LABELLED
	 * quoted material: data the agent reads, never instructions it obeys (L3).
	 */
	body: string;
	/**
	 * REQUIRED, and non-optional on purpose: the one sentence saying where this
	 * came from and why it was selected (L1). A caller cannot skip provenance
	 * by omitting a field. Never empty — an empty `why` is a broken item.
	 */
	why: string;
	/** From estimateTokens(), over exactly the text that will be rendered. */
	tokens: number;
	/** Selection score. Meaningless for `pinned`, which never competes. */
	score: number;
	tier: ContextTier;
	/** Repo-relative when the item has a file; absolute paths leak $HOME. */
	path?: string;
}

/** Why an item that was gathered did not reach the block (L2). */
export type OmissionReason =
	/** No room left under budgetTokens. */
	| "budget"
	/** Near-duplicate of an item already kept (diversity selection). */
	| "duplicate"
	/** Its source hit a per-source item or token cap. */
	| "capped"
	/** Empty after redaction or after trimming to a boundary. */
	| "empty";

/**
 * A dropped item, as a value rather than a log line. Silent truncation looks
 * exactly like having found nothing, and only surfaces later as the agent not
 * knowing something it should have.
 */
export interface Omission {
	id: string;
	source: ContextSourceId;
	title: string;
	reason: OmissionReason;
	/** Human detail: "needed 800 tokens, 120 left". Never empty. */
	note: string;
	tokens: number;
	path?: string;
}

/** "partial" and "failed" are normal outcomes, not errors (L7). */
export type SourceStatus = "ok" | "partial" | "failed" | "skipped";

/**
 * What gather() hands back. `notes` carries the degradation — unreadable file,
 * no git, missing index — so a thin context states WHY it is thin.
 */
export interface SourceResult {
	items: ContextItem[];
	status: SourceStatus;
	/** Non-empty whenever status is not "ok". Each note is one sentence. */
	notes: string[];
}

/** A source's result as recorded in the build, after caps and packing. */
export interface SourceOutcome extends SourceResult {
	source: ContextSourceId;
	label: string;
	/** How many of its items survived into `text`. */
	kept: number;
}

/**
 * One place context comes from. `gather` is TOTAL: it catches its own I/O and
 * never throws, because one unreadable corpus must cost items and a stated
 * reason, not the run (L7). Synchronous, and pure with respect to the clock —
 * same repo and corpus, same items, same order (L5).
 */
export interface ContextSource {
	id: ContextSourceId;
	/** Human label for the report: "House rules", "Verify chain". */
	label: string;
	gather(req: ContextRequest): SourceResult;
}

/**
 * The frozen snapshot, built once per run and again on resume (L6).
 * Byte-identical for the same task, repo and corpus (L5).
 */
export interface BuiltContext {
	/** The rendered block, ready to prepend. Empty string when nothing fit. */
	text: string;
	/** Everything in `text`, in rendered order: pinned first, then ranked. */
	included: ContextItem[];
	/** Everything gathered that is not in `text`, with its reason (L2). */
	omitted: Omission[];
	/** estimateTokens(text); always <= budget. */
	tokens: number;
	/** The ceiling this build was given, echoed so a report needs no request. */
	budget: number;
	/** Every registered source, including those that returned nothing. */
	outcomes: SourceOutcome[];
}
