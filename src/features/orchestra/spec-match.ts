/**
 * Does an agent we already have fit this task? Matching is on `description`
 * ALONE — that is the field's whole job ("WHEN to use this agent"), and the
 * moment the prompt body or the name also counted, a spec's routing would
 * depend on text nobody wrote for routing.
 *
 * The score is coverage of the description by the task, not the reverse: a
 * long task must still match a short precise description, while a vague
 * description ("helps with code") matches everything and is therefore held
 * back by the threshold rather than by a special case.
 *
 * Deterministic by construction — same task, same registry, same answer —
 * because "create an agent when needed" must not create one every other run.
 */
import { queryTerms } from "../history/tokenize.js";
import type { AgentSpec } from "./types.js";

export interface SpecMatch {
	spec: AgentSpec;
	/** Fraction of the description's terms the task also uses, 0…1. */
	score: number;
}

/** Below this an existing agent is a worse answer than a new, precise one. */
export const MATCH_THRESHOLD = 0.6;

/** One shared term is a coincidence; the floor keeps two-word descriptions honest. */
const MIN_SHARED = 2;

export function scoreSpec(taskTerms: ReadonlySet<string>, spec: AgentSpec): number {
	const terms = queryTerms(spec.description);
	if (terms.length === 0) return 0;
	const shared = terms.filter((t) => taskTerms.has(t)).length;
	return shared < MIN_SHARED ? 0 : shared / terms.length;
}

/** The best-scoring spec at or above `threshold`; ties break by name. */
export function matchAgent(
	task: string,
	specs: readonly AgentSpec[],
	threshold: number = MATCH_THRESHOLD,
): SpecMatch | undefined {
	const taskTerms = new Set(queryTerms(task));
	let best: SpecMatch | undefined;
	for (const spec of [...specs].sort((a, b) => a.name.localeCompare(b.name))) {
		const score = scoreSpec(taskTerms, spec);
		if (score >= threshold && (best === undefined || score > best.score)) best = { spec, score };
	}
	return best;
}
