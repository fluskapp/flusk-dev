/**
 * The gate's durable record: a decision entry in the session (always written —
 * sessions do not depend on memory), plus the run's facts of record (only when
 * a store exists). Split from gate-loop so the loop stays the loop.
 */
import type { Agent } from "../features/run/options.js";
import type { GateDecision } from "../features/session/gate-fold.js";
import type { FactInput } from "../features/facts/types.js";
import type { VerifyCommandResult } from "../features/verify/gate.repository.js";
import { runFact } from "../features/verify/run-facts.js";
import type { GateOpts } from "./gate-loop.js";

export type { GateDecision } from "../features/session/gate-fold.js";
export type GateAttempt = NonNullable<GateDecision["attempts"]>[number];

/** The failing evidence of one verify attempt, stamped with its retry index. */
export function failingAttempts(retry: number, results: VerifyCommandResult[]): GateAttempt[] {
	return results
		.filter((r) => r.skipped !== true && r.exitCode !== 0)
		.map((r) => ({ retry, cmd: r.cmd, exitCode: r.exitCode, tail: r.tail, skipped: false }));
}

export function passingCmds(results: VerifyCommandResult[]): string[] {
	return results.filter((r) => r.skipped !== true && r.exitCode === 0).map((r) => r.cmd);
}

/** One deduplicated "verify failed: <cmd> exited <code>" line per distinct failure. */
function blockedReasons(attempts: GateAttempt[]): string[] {
	const out: string[] = [];
	for (const a of attempts) {
		const line = `verify failed: ${a.cmd} exited ${a.exitCode}`;
		if (!out.includes(line)) out.push(line);
	}
	return out;
}

/** Each predicate its own transact (one transact may not assert the same
 * (subject, predicate) twice — gate-report.ts's rule); a refusing ledger
 * warns and never changes the outcome. */
async function writeFacts(opts: GateOpts, facts: FactInput[]): Promise<void> {
	if (opts.store === null || facts.length === 0) return;
	try {
		for (const f of facts) await opts.store.transact(opts.ns, [f]);
	} catch (e) {
		const detail = e instanceof Error ? e.message : String(e);
		opts.out.write(`warning: gate evidence was not recorded (${detail})\n`);
	}
}

/** Session entry first (must survive a refusing ledger), facts second. */
export async function recordGate(
	agent: Agent,
	opts: GateOpts,
	runId: string,
	decision: Omit<GateDecision, "kind">,
): Promise<void> {
	if (decision.reportCheck === undefined && decision.outcome === "blocked") {
		// Exhausted retries: claimCheck never ran, so the "why" is derived from
		// the attempts ONCE, into the entry — the canonical source — so a
		// memory-off run renders the same reasons a memory-on run does.
		const why = blockedReasons(decision.attempts ?? []);
		if (why.length > 0) decision = { ...decision, reasons: why };
	}
	try {
		agent.session.appendDecision({ kind: "gate", ...decision });
	} catch (e) {
		const detail = e instanceof Error ? e.message : String(e);
		opts.out.write(`warning: gate record was not written (${detail})\n`);
	}
	const facts: FactInput[] = [];
	if (decision.reportCheck === undefined && decision.outcome === "blocked") {
		// Exhausted retries: claimCheck never ran, so nothing else records this run.
		facts.push(runFact.outcome(runId, "blocked"));
		for (const cmd of decision.verified) facts.push(runFact.verifiedBy(runId, cmd));
		for (const line of decision.reasons ?? []) facts.push(runFact.failedBecause(runId, line));
	} else if (decision.reportCheck === "BLOCK") {
		// claimCheck already wrote outcome/verified_by/report_check; add the "why".
		for (const r of decision.reasons ?? []) facts.push(runFact.failedBecause(runId, r));
	}
	await writeFacts(opts, facts);
}
