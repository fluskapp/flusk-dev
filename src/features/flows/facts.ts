/**
 * The flow feature's fact builders, and lesson promotion.
 *
 * Ported from the deleted abagraph memory client onto the local FactStore:
 * same subjects, same predicates, same promotion rule. Cardinalities live in
 * src/store/facts.ts — the one table the store enforces — so a builder here
 * cannot disagree with what a transact will do.
 *
 * Promotion is the self-improvement step: facts that generalize beyond one
 * repo graduate from `repo:<slug>` into the shared `lessons` namespace, but
 * ONLY from runs that passed verification with an ALLOW verdict, so an
 * unverified guess never becomes cross-repo advice.
 */
import { fact } from "../facts/facts.js";
import type { Fact, FactInput, FactStore } from "../facts/types.js";

/** Cross-repo lessons live here, beside the per-repo namespaces. */
export const LESSONS_NS = "lessons";

/** Verification's judgement of the run whose lessons are being considered. */
export type Verdict = "ALLOW" | "WARN" | "BLOCK";

const PROMOTED_CONFIDENCE = 0.9;

/** Subjects whose knowledge is not specific to one repository. */
const PORTABLE_PREFIXES = ["ErrorClass:", "Tool:", "Approach:"];

export function isPortableSubject(subject: string): boolean {
	return PORTABLE_PREFIXES.some((p) => subject.startsWith(p));
}

export const lessonFact = {
	fixedBy: (errorClassSlug: string, approach: string, confidence?: number) =>
		fact(`ErrorClass:${errorClassSlug}`, "fixed_by", approach, confidence),
	seenIn: (errorClassSlug: string, repoSlug: string, confidence?: number) =>
		fact(`ErrorClass:${errorClassSlug}`, "seen_in", `Repo:${repoSlug}`, confidence),
	workedFor: (approachSlug: string, situation: string, confidence?: number) =>
		fact(`Approach:${approachSlug}`, "worked_for", situation, confidence),
};

export interface PromotionResult {
	promoted: number;
	skipped: string;
}

/**
 * Copy this run's portable lessons into the lessons namespace. Candidates as
 * well as active facts: extracted lessons are written at <= 0.7, which the
 * store parks below its 0.75 Candidate threshold and hides from default
 * reads. Promotion is exactly the act of confirming one, so a query that saw
 * only active facts would never promote anything.
 */
export async function promoteLessons(
	store: FactStore,
	repoNs: string,
	repoSlug: string,
	runId: string,
	verdict: Verdict,
): Promise<PromotionResult> {
	if (verdict !== "ALLOW") {
		return { promoted: 0, skipped: `verdict ${verdict} — lessons stay repo-local` };
	}
	const source = `digest:run:${runId}`;
	const rows: Fact[] = await store.query(repoNs, { status: "active,candidate", limit: 200 });
	const candidates = rows.filter((f) => f.source === source && isPortableSubject(f.subject));
	let promoted = 0;
	for (const f of candidates) {
		// fact() stamps the cardinality from the one table that owns it: only
		// `fixed_by` is functional (a better fix supersedes); the rest accumulate.
		const row: FactInput = {
			...fact(f.subject, f.predicate, f.object, PROMOTED_CONFIDENCE),
			source: `promoted:run:${runId}`,
		};
		await store.transact(LESSONS_NS, [row]);
		promoted++;
		if (f.subject.startsWith("ErrorClass:")) {
			const slug = f.subject.slice("ErrorClass:".length);
			await store.transact(LESSONS_NS, [lessonFact.seenIn(slug, repoSlug, PROMOTED_CONFIDENCE)]);
		}
	}
	return { promoted, skipped: "" };
}
