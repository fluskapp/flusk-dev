/**
 * Typed builders for every row of docs/vocabulary.md — the ONLY place hit
 * spells predicate strings. Coexist flags mirror the vocabulary cardinality
 * column (coexist rows map to abagraph's Coexist conflict policy; functional
 * rows use the default AutoSupersede). Confidence defaults to 1.0
 * (harness-observed) and is overridable per the vocabulary conventions.
 */
import type { MemFactInput } from "./client-types.js";

export type GoalStatus = "planned" | "active" | "done" | "abandoned";
export type TaskStatus = "pending" | "running" | "done" | "failed" | "blocked";

type Cardinality = "functional" | "coexist";

/** subject-type prefix → predicate → cardinality; one entry per vocabulary row. */
const VOCABULARY: Record<string, Record<string, Cardinality>> = {
	Repo: { uses: "coexist", verify_cmd: "coexist", convention: "coexist" },
	Goal: { title: "functional", status: "functional", has_task: "coexist" },
	Task: {
		description: "functional",
		status: "functional",
		depends_on: "coexist",
		attempted_by: "coexist",
	},
	Run: {
		outcome: "functional",
		touched: "coexist",
		verified_by: "coexist",
		failed_because: "coexist",
	},
	Session: { ended_at: "functional" },
	ErrorClass: { fixed_by: "functional", seen_in: "coexist" },
	Tool: { gotcha: "coexist" },
	Approach: { worked_for: "coexist", failed_for: "coexist" },
	Item: { attempted_at: "functional", outcome: "functional", cooldown_until: "functional" },
	Night: { runs_count: "functional" },
};

/** memory_remember validation: is (subject type, predicate) a vocabulary row? */
export function isVocabularyPredicate(subjectPrefix: string, predicate: string): boolean {
	return VOCABULARY[subjectPrefix]?.[predicate] !== undefined;
}

/** All "<SubjectType> <predicate>" pairs — the rejection error message body. */
export function vocabularyRows(): string[] {
	return Object.entries(VOCABULARY).flatMap(([s, preds]) =>
		Object.keys(preds).map((p) => `${s} ${p}`),
	);
}

/** Generic builder for validated agent-authored facts (memory_remember):
 * stamps the vocabulary coexist flag for the (subject type, predicate) row. */
export function vocabularyFact(
	subject: string,
	predicate: string,
	object: string,
	confidence?: number,
): MemFactInput {
	return fact(subject, predicate, object, confidence);
}

function fact(subject: string, predicate: string, object: string, confidence = 1): MemFactInput {
	const prefix = subject.split(":", 1)[0] ?? "";
	const base: MemFactInput = { subject, predicate, object, confidence };
	if (VOCABULARY[prefix]?.[predicate] === "coexist") base.coexist = true;
	return base;
}

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
