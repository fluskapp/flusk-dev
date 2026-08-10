/**
 * Typed builders for every row of docs/vocabulary.md — the ONLY place hit
 * spells predicate strings. Coexist flags mirror the vocabulary cardinality
 * column (coexist rows map to abagraph's Coexist conflict policy; functional
 * rows use the default AutoSupersede). Confidence defaults to 1.0
 * (harness-observed) and is overridable per the vocabulary conventions.
 */
import type { MemFactInput } from "./client-types.js";

import {
	fact,
	type GoalStatus,
	type TaskStatus,
} from "./vocabulary.js";

export type { GoalStatus, TaskStatus };
export {
	isPortableSubject,
	isVocabularyPredicate,
	vocabularyFact,
	vocabularyRows,
} from "./vocabulary.js";

export const repoFact = {
	verifyCmd: (slug: string, cmd: string, confidence?: number) =>
		fact(`Repo:${slug}`, "verify_cmd", cmd, confidence),
	convention: (slug: string, text: string, confidence?: number) =>
		fact(`Repo:${slug}`, "convention", text, confidence),
	uses: (slug: string, tool: string, confidence?: number) =>
		fact(`Repo:${slug}`, "uses", `Tool:${tool}`, confidence),
};

export const runFact = {
	outcome: (runId: string, outcome: string, confidence?: number) =>
		fact(`Run:${runId}`, "outcome", outcome, confidence),
	touched: (runId: string, path: string, confidence?: number) =>
		fact(`Run:${runId}`, "touched", `File:${path}`, confidence),
	verifiedBy: (runId: string, cmd: string, confidence?: number) =>
		fact(`Run:${runId}`, "verified_by", cmd, confidence),
	failedBecause: (runId: string, reason: string, confidence?: number) =>
		fact(`Run:${runId}`, "failed_because", reason, confidence),
	/** Verdict of the report-vs-observations check. Its own predicate: writing
	 * it to `outcome` would supersede the run's real outcome. */
	reportCheck: (runId: string, verdict: string, confidence?: number) =>
		fact(`Run:${runId}`, "report_check", verdict, confidence),
};

export const sessionFact = {
	endedAt: (sessionId: string, isoTimestamp: string, confidence?: number) =>
		fact(`Session:${sessionId}`, "ended_at", isoTimestamp, confidence),
};

export const goalFact = {
	title: (goalId: string, title: string, confidence?: number) =>
		fact(`Goal:${goalId}`, "title", title, confidence),
	status: (goalId: string, status: GoalStatus, confidence?: number) =>
		fact(`Goal:${goalId}`, "status", status, confidence),
	hasTask: (goalId: string, taskId: string, confidence?: number) =>
		fact(`Goal:${goalId}`, "has_task", `Task:${taskId}`, confidence),
};

export const taskFact = {
	description: (taskId: string, text: string, confidence?: number) =>
		fact(`Task:${taskId}`, "description", text, confidence),
	status: (taskId: string, status: TaskStatus, confidence?: number) =>
		fact(`Task:${taskId}`, "status", status, confidence),
	dependsOn: (taskId: string, otherTaskId: string, confidence?: number) =>
		fact(`Task:${taskId}`, "depends_on", `Task:${otherTaskId}`, confidence),
	attemptedBy: (taskId: string, runId: string, confidence?: number) =>
		fact(`Task:${taskId}`, "attempted_by", `Run:${runId}`, confidence),
};

export const lessonFact = {
	fixedBy: (errorClassSlug: string, approach: string, confidence?: number) =>
		fact(`ErrorClass:${errorClassSlug}`, "fixed_by", approach, confidence),
	seenIn: (errorClassSlug: string, repoSlug: string, confidence?: number) =>
		fact(`ErrorClass:${errorClassSlug}`, "seen_in", `Repo:${repoSlug}`, confidence),
	gotcha: (toolName: string, text: string, confidence?: number) =>
		fact(`Tool:${toolName}`, "gotcha", text, confidence),
	workedFor: (approachSlug: string, situation: string, confidence?: number) =>
		fact(`Approach:${approachSlug}`, "worked_for", situation, confidence),
	failedFor: (approachSlug: string, situation: string, confidence?: number) =>
		fact(`Approach:${approachSlug}`, "failed_for", situation, confidence),
};

export const watchFact = {
	attemptedAt: (itemKey: string, isoTimestamp: string, confidence?: number) =>
		fact(`Item:${itemKey}`, "attempted_at", isoTimestamp, confidence),
	outcome: (itemKey: string, outcome: string, confidence?: number) =>
		fact(`Item:${itemKey}`, "outcome", outcome, confidence),
	/** TTL ephemera: transient + validUntil → hard-deleted by the sweeper. */
	cooldownUntil: (itemKey: string, untilIso: string, confidence?: number): MemFactInput => ({
		...fact(`Item:${itemKey}`, "cooldown_until", untilIso, confidence),
		transient: true,
		validUntil: untilIso,
	}),
	runsCount: (date: string, count: number, confidence?: number) =>
		fact(`Night:${date}`, "runs_count", String(count), confidence),
	/**
	 * Explicit counter rather than counting superseded `outcome` facts:
	 * supersession sets `valid_until`, and a default read excludes those
	 * (core/match.rs), so history archaeology silently under-counts and the
	 * backoff would never escalate.
	 */
	failureCount: (itemKey: string, count: number, confidence?: number) =>
		fact(`Item:${itemKey}`, "failure_count", String(count), confidence),
};
