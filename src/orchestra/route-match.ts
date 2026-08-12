/**
 * How well one agent fits one task, in one number.
 *
 * Everything here is a THIN layer over machinery that already exists, on
 * purpose:
 *   - description coverage is spec-match.ts's `scoreSpec` (0…1), so "does
 *     this agent claim this job" has exactly one definition in the repo;
 *   - the task kind is src/provider/intent.ts;
 *   - the per-kind model numbers are src/provider/scores.ts.
 * There is no second scoring scheme, and no field other than `description`
 * ever meets the task text — a spec must not win work by naming a good model.
 *
 * Weights say the priority out loud: description first, kind agreement as a
 * nudge, benchmarks smallest. A clearly-worded agent has to beat a
 * better-benchmarked one that does not claim the job, or routing stops being
 * explainable.
 */
import type { FluskConfig, TaskKind } from "../config/types.js";
import { queryTerms } from "../history/tokenize.js";
import type { Scores } from "../provider/scores.js";
import { scoreSpec } from "./spec-match.js";
import type { AgentSpec } from "./types.js";

/** Both are deliberately below 1, the maximum description coverage. */
const KIND_BONUS = 0.25;
const BENCH_WEIGHT = 0.2;

export interface Fit {
	/** Description coverage, 0…1. Zero means the agent does not claim the job. */
	description: number;
	/** Recorded benchmark for the model this spec would run on, 0 when none. */
	bench: number;
	/** The ordering key: description, then kind agreement, then benchmark. */
	total: number;
}

/**
 * The "provider/id" key src/provider/scores.ts records benchmarks under.
 * An "internal" spec runs on the parent's routed model, so it scores as the
 * configured model for the kind; a backend-driven spec scores as the model it
 * actually names.
 */
export function benchKey(spec: AgentSpec, cfg: FluskConfig, kind: TaskKind): string {
	if (spec.worker === "internal") {
		const choice = cfg.models[kind];
		return `${choice.provider}/${choice.id}`;
	}
	const backend = spec.backendId ?? "";
	return `${backend}/${spec.model ?? backend}`;
}

export function fitFor(
	taskTerms: ReadonlySet<string>,
	spec: AgentSpec,
	kind: TaskKind,
	cfg: FluskConfig,
	scores: Scores | undefined,
): Fit {
	const description = scoreSpec(taskTerms, spec);
	const bench = scores?.[kind]?.[benchKey(spec, cfg, kind)] ?? 0;
	// The kind is a word ("review", "plan"); a description that uses it is
	// claiming that kind of work, which is the cheapest honest signal there is.
	const claimsKind = queryTerms(spec.description).includes(kind);
	const total = description + (claimsKind ? KIND_BONUS : 0) + BENCH_WEIGHT * bench;
	return { description, bench, total };
}

/** De-duplicated task terms, computed once per routing decision. */
export function taskTermsOf(task: string): Set<string> {
	return new Set(queryTerms(task));
}
