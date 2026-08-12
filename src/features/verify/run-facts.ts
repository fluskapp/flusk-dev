/**
 * The three rows the gate records about a finished run: what the run ended as,
 * which verify commands passed, and how its closing report stood up. They are
 * the run's durable record — a session file holds the transcript, and these
 * hold the judgement made about it, in a namespace a later session can read
 * without replaying anything. They are written even when the verdict is a
 * block, because a blocked run is exactly the one worth being able to look up.
 *
 * `outcome` and `report_check` are functional (the latest value is the run's
 * answer); `verified_by` accumulates, one row per command that passed. Those
 * cardinalities live in src/store/facts.ts, which is where the store reads
 * them from — spelling them again here is how the two would drift apart.
 */
import { fact } from "../facts/facts.js";
import type { FactInput } from "../facts/types.js";

export const runFact = {
	outcome: (runId: string, outcome: string): FactInput =>
		fact(`Run:${runId}`, "outcome", outcome),
	verifiedBy: (runId: string, cmd: string): FactInput => fact(`Run:${runId}`, "verified_by", cmd),
	/** Verdict of the report-vs-observations check. Its own predicate: writing
	 * it to `outcome` would supersede the run's real outcome. */
	reportCheck: (runId: string, verdict: string): FactInput =>
		fact(`Run:${runId}`, "report_check", verdict),
};
