/**
 * The one thing a run can honestly teach: a step that failed and whose retry
 * succeeded. What changed is written as an ErrorClass/Approach fact and handed
 * to the EXISTING promotion rules — verified runs only, so an unverified guess
 * never becomes cross-repo advice (docs/review-findings.md).
 */
import { lessonFact, promoteLessons, type Verdict } from "./facts.js";
import type { FactStore } from "../facts/types.js";
import type { FlowResult, FlowStep } from "./types.js";

type Fix = { failed: FlowStep; fixed: FlowStep };

/** Extracted, not yet confirmed — the store parks this as a Candidate, and
 * promotion is exactly the act of confirming one (src/lang/facts.ts). */
const EXTRACTED = 0.7;

/**
 * A verified run: it did not crash and the LAST verification of it passed.
 *
 * Reading `r.ok` instead was a promotion rule that could never fire — every
 * fail-then-succeed pair is on a blocking kind, which is exactly what makes
 * `ok` false — so an honest lesson was always downgraded to WARN.
 */
const verified = (r: FlowResult): boolean => {
	const last = [...r.state.steps].reverse().find((s) => s.kind === "verify");
	return r.outcome !== "failed" && last?.ok === true;
};

/** Attempts of one node where a failure was later followed by a success. */
export function fixes(steps: FlowStep[]): Fix[] {
	const open = new Map<string, FlowStep>();
	const out: Fix[] = [];
	for (const s of steps) {
		if (!s.ok) {
			open.set(s.nodeId, s);
			continue;
		}
		const failed = open.get(s.nodeId);
		if (failed) out.push({ failed, fixed: s });
		open.delete(s.nodeId);
	}
	return out;
}

const slugOf = (s: string): string =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.split("-")
		.filter(Boolean)
		.slice(0, 4)
		.join("-") || "unknown";

/** The lesson body: what the winning attempt did differently. */
function changedText({ failed, fixed }: Fix): string {
	const why = (failed.note ?? "an unexplained failure").replace(/\s+/g, " ").slice(0, 140);
	const how = fixed.note?.replace(/\s+/g, " ").trim() ?? "";
	return how === ""
		? `retried ${fixed.nodeId} (${fixed.kind}) after: ${why}`
		: `${how.slice(0, 160)} — after: ${why}`;
}

export async function writeLessons(
	r: FlowResult,
	store: FactStore,
	ns: string,
	at: { slug: string; runId: string },
): Promise<number> {
	const found = fixes(r.state.steps);
	if (found.length === 0) return 0;
	const source = `digest:run:${at.runId}`;
	for (const fix of found) {
		const body = changedText(fix);
		// A failure note names an ErrorClass; without one, only the approach
		// generalizes — "this kind of step works on the second try" is a lesson.
		const base = fix.failed.note
			? lessonFact.fixedBy(slugOf(fix.failed.note), body, EXTRACTED)
			: lessonFact.workedFor(slugOf(`${fix.fixed.kind}-retry`), body, EXTRACTED);
		await store.transact(ns, [{ ...base, source }]);
	}
	const verdict: Verdict = verified(r) ? "ALLOW" : "WARN";
	return (await promoteLessons(store, ns, at.slug, at.runId, verdict)).promoted;
}
