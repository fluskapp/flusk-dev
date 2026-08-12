/**
 * The cardinality of every predicate the harness may assert, and the single
 * builder that stamps it. A functional row REPLACES the current value for its
 * (subject, predicate); a coexist row is ADDED beside it. A flag set the wrong
 * way is not a visible error — it silently loses either the new value (a
 * goal's status stops advancing) or the old one (a task's dependencies
 * collapse to the last edge).
 *
 * Every assert flusk makes is built by `fact()`, so this table is not a
 * description of the behaviour, it IS the behaviour: no other module decides a
 * cardinality, and an assert whose (subject type, predicate) has no row here
 * is refused rather than guessed at. The predicates themselves are spelled by
 * the module that owns their meaning — the goal graph in src/goals/schema.ts,
 * a finished run in src/verify/run-facts.ts, the attempt ledger below.
 *
 * Confidence defaults to 1.0, which is what "the harness observed this itself"
 * is worth; callers lower it for anything inferred.
 */
import type { FactInput } from "./types.js";

type Cardinality = "functional" | "coexist";

/** subject-type prefix → predicate → cardinality; one entry per vocabulary row. */
const VOCABULARY: Record<string, Record<string, Cardinality>> = {
	Goal: { title: "functional", status: "functional", has_task: "coexist" },
	Task: {
		description: "functional",
		status: "functional",
		depends_on: "coexist",
		attempted_by: "coexist",
	},
	Run: { outcome: "functional", verified_by: "coexist", report_check: "functional" },
	Item: {
		attempted_at: "functional",
		outcome: "functional",
		cooldown_until: "functional",
		failure_count: "functional",
	},
	Night: { run: "coexist" },
};

/**
 * The only way to build an assert. An unknown (subject type, predicate) throws
 * instead of defaulting: a typo that silently became a functional predicate
 * would close the row it meant to sit beside, and nothing downstream would
 * report anything but a missing value.
 */
export function fact(
	subject: string,
	predicate: string,
	object: string,
	confidence = 1,
): FactInput {
	const prefix = subject.split(":", 1)[0] ?? "";
	const cardinality = VOCABULARY[prefix]?.[predicate];
	if (cardinality === undefined) {
		throw new Error(`fact: no vocabulary row for (${prefix}, ${predicate})`);
	}
	const base: FactInput = { subject, predicate, object, confidence };
	if (cardinality === "coexist") base.coexist = true;
	return base;
}

export const watchFact = {
	attemptedAt: (itemKey: string, isoTimestamp: string, confidence?: number) =>
		fact(`Item:${itemKey}`, "attempted_at", isoTimestamp, confidence),
	outcome: (itemKey: string, outcome: string, confidence?: number) =>
		fact(`Item:${itemKey}`, "outcome", outcome, confidence),
	/** TTL ephemera: transient + validUntil, so the row stops being visible the
	 * instant the cooldown ends and a sweeper may later drop it. */
	cooldownUntil: (itemKey: string, untilIso: string, confidence?: number): FactInput => ({
		...fact(`Item:${itemKey}`, "cooldown_until", untilIso, confidence),
		transient: true,
		validUntil: untilIso,
	}),
	/**
	 * One coexisting row per run of a night, rather than a counter. A counter
	 * is read-modify-write: two watchers reading the same value both write the
	 * successor and the night's cap silently counts one run instead of two,
	 * and no compare can guard the first write of a night because there is no
	 * prior value to compare against. Rows cannot lose that race — the count
	 * is how many of them are visible.
	 */
	nightRun: (date: string, runKey: string, confidence?: number) =>
		fact(`Night:${date}`, "run", runKey, confidence),
	/**
	 * Explicit counter rather than counting superseded `outcome` facts:
	 * supersession stamps valid_until, a live read excludes those, and history
	 * archaeology would therefore under-count and never escalate the backoff.
	 */
	failureCount: (itemKey: string, count: number, confidence?: number) =>
		fact(`Item:${itemKey}`, "failure_count", String(count), confidence),
};
