import type { ModelRef, Msg, RunEndReason, RunStats } from "../core/types.js";

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

export type SessionEntry = HeaderEntry | MessageEntry | CompactionEntry | StatsEntry;
