import type { ModelRef, Msg, RunStats } from "../core/types.js";

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
}

export type SessionEntry = HeaderEntry | MessageEntry | CompactionEntry | StatsEntry;
