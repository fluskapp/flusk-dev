import type { ModelRef, Msg, RunEndReason, RunStats } from "../run/run.types.js";

export const SESSION_VERSION = 1;

/** First line of every session file. */
export interface HeaderEntry {
	type: "header";
	version: number;
	id: string;
	task: string;
	repoRoot: string;
	gitBranch: string | null;
	model: ModelRef;
	createdAt: string;
	/** Links a subagent session to its parent. */
	parentSession?: string;
	/** Routing kind chosen at run start (plan|code|review|summarize). */
	taskKind?: string;
}

export interface MessageEntry {
	type: "message";
	id: number;
	msg: Msg;
}

/** Context rebuild = summary as a user message + entries from firstKeptEntryId. */
export interface CompactionEntry {
	type: "compaction";
	id: number;
	summary: string;
	firstKeptEntryId: number;
	tokensBefore: number;
}

export interface StatsEntry {
	type: "stats";
	id: number;
	stats: RunStats;
	/** Why the run ended; older files omit it (UI then derives from stopReason). */
	reason?: RunEndReason;
}

/**
 * A decision the harness made about this run, written down when it was made.
 * The workbench and `flusk explain` assemble these into the account a
 * reviewer reads; every reader filters by type, so old files (and new entry
 * kinds) are tolerated by construction.
 */
export interface DecisionEntry {
	type: "decision";
	id: number;
	at: string;
	decision: Decision;
}

export type Decision =
	| {
			/** The loop's run id — the subject the gate's facts are recorded under.
			 * A session outlives its runs (resume, retry), so several may append. */
			kind: "run";
			runId: string;
	  }
	| {
			kind: "model";
			/** "provider/id" as resolved. */
			ref: string;
			taskKind: string;
			/** Where the choice came from: measured scores, config, or a flag. */
			source: "scores" | "config" | "override" | "fake";
	  }
	| {
			kind: "context";
			tokens: number;
			budget: number;
			included: number;
			omitted: number;
			/** Per-source: what it contributed, including the ones that found nothing. */
			sources: Array<{ source: string; status: string; kept: number }>;
			/** Present when assembly itself failed and the run went on without. */
			error?: string;
	  }
	| {
			kind: "isolation";
			branch: string | null;
			why: string;
	  }
	| {
			/** `flusk run --spec <name>`: which authored intent this run served. */
			kind: "spec";
			name: string;
			mode: string;
			/** Repo-relative path of the spec file. */
			path: string;
	  };

export type SessionEntry = HeaderEntry | MessageEntry | CompactionEntry | StatsEntry | DecisionEntry;
