/**
 * The predicate vocabulary (docs/vocabulary.md) and its validators — the
 * single source of truth for what ah is allowed to assert.
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
		report_check: "functional",
		touched: "coexist",
		verified_by: "coexist",
		failed_because: "coexist",
	},
	Session: { ended_at: "functional" },
	ErrorClass: { fixed_by: "functional", seen_in: "coexist" },
	Tool: { gotcha: "coexist" },
	Approach: { worked_for: "coexist", failed_for: "coexist" },
	Item: {
		attempted_at: "functional",
		outcome: "functional",
		cooldown_until: "functional",
		failure_count: "functional",
	},
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

export function fact(subject: string, predicate: string, object: string, confidence = 1): MemFactInput {
	const prefix = subject.split(":", 1)[0] ?? "";
	const base: MemFactInput = { subject, predicate, object, confidence };
	if (VOCABULARY[prefix]?.[predicate] === "coexist") base.coexist = true;
	return base;
}


/** Subjects whose knowledge is not specific to one repository. */
const PORTABLE_PREFIXES = ["ErrorClass:", "Tool:", "Approach:"];

export function isPortableSubject(subject: string): boolean {
	return PORTABLE_PREFIXES.some((p) => subject.startsWith(p));
}
