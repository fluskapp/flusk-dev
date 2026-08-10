/**
 * Lesson promotion: the self-improvement step. Facts that generalize beyond
 * one repo graduate from `repo:<slug>` into the shared `lessons` namespace —
 * but ONLY from runs that passed verification with an ALLOW verdict, so an
 * unverified guess never becomes cross-repo advice.
 *
 * Promoted rows land at 0.9 (verification-confirmed). Re-promoting the same
 * lesson is idempotent: abagraph dedups an identical assert, and a better
 * `fixed_by` supersedes the old one while keeping its history.
 */
import type { MemFact, MemFactInput, MemoryClient, MemVerdict } from "../memory/client-types.js";
import { lessonFact } from "../memory/facts.js";
import { LESSONS_NS } from "../memory/namespaces.js";

/** Subjects whose knowledge is not specific to one repository. */
const PORTABLE = ["ErrorClass:", "Tool:", "Approach:"];

const PROMOTED_CONFIDENCE = 0.9;

export function isPortableSubject(subject: string): boolean {
	return PORTABLE.some((p) => subject.startsWith(p));
}

export interface PromotionResult {
	promoted: number;
	skipped: string;
}

/**
 * Copy this run's portable lessons into the lessons namespace.
 * Each fact goes in its own transact: abagraph rejects two asserts on the
 * same (subject, predicate) in one call, even for coexist predicates.
 */
export async function promoteLessons(
	client: MemoryClient,
	repoNs: string,
	repoSlug: string,
	runId: string,
	verdict: MemVerdict,
): Promise<PromotionResult> {
	if (verdict !== "ALLOW") {
		return { promoted: 0, skipped: `verdict ${verdict} — lessons stay repo-local` };
	}
	const source = `digest:run:${runId}`;
	// Candidates as well as active facts: extracted lessons are written at
	// <= 0.7, which abagraph parks below its 0.75 Candidate threshold and
	// hides from default reads. Promotion is exactly the act of confirming
	// one, so a query that saw only active facts would never promote anything.
	const rows: MemFact[] = [];
	for (const status of ["active", "candidate"]) {
		rows.push(...(await client.query(repoNs, { status, limit: 200 })));
	}
	const candidates = rows.filter((f) => f.source === source && isPortableSubject(f.subject));
	let promoted = 0;
	for (const f of candidates) {
		const row: MemFactInput = {
			subject: f.subject,
			predicate: f.predicate,
			object: f.object,
			confidence: PROMOTED_CONFIDENCE,
			source: `promoted:run:${runId}`,
			// Only `fixed_by` is functional (a better fix supersedes); the rest
			// accumulate — see docs/vocabulary.md.
			coexist: f.predicate !== "fixed_by",
		};
		await client.transact(LESSONS_NS, [row]);
		promoted++;
		if (f.subject.startsWith("ErrorClass:")) {
			const slug = f.subject.slice("ErrorClass:".length);
			await client.transact(LESSONS_NS, [
				lessonFact.seenIn(slug, repoSlug, PROMOTED_CONFIDENCE),
			]);
		}
	}
	return { promoted, skipped: "" };
}
