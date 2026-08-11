/**
 * The completion check: read the agent's closing report and test it against
 * what the harness observed, then record the verdict for the audit trail.
 */
import type { Agent } from "../agent/options.js";
import type { RunRecord } from "../core/run-record.js";
import type { FactStore } from "../store/types.js";
import type { VerifyCommandResult } from "../verify/gate.js";
import { checkReportText } from "../verify/report-check.js";
import { runFact } from "../verify/run-facts.js";
import type { GateOpts } from "./gate-loop.js";

/** The agent's closing words — the only text the model authored. */
export function finalReport(agent: Agent): string {
	const msgs = agent.session.buildContext();
	for (let i = msgs.length - 1; i >= 0; i--) {
		const m = msgs[i];
		if (m?.role !== "assistant") continue;
		const text = m.content
			.filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
			.map((b) => b.text)
			.join("");
		if (text.trim() !== "") return text;
	}
	return "";
}

/**
 * Check the report against what the harness observed, then record the run and
 * the verdict for the audit trail. The store is the LEDGER here, not the
 * judge: asking it to confirm facts the harness itself just wrote would be
 * circular, so the verdict is decided from observations alone.
 *
 * These are the run's only facts of record, and each predicate needs its own
 * transact, because one transact may not assert the same (subject, predicate)
 * twice.
 */
export async function claimCheck(
	store: FactStore | null,
	opts: GateOpts,
	run: RunRecord,
	results: VerifyCommandResult[],
	report: string,
): Promise<"completed" | "blocked"> {
	const check = checkReportText(report, {
		verify: results,
		filesTouched: run.filesTouched,
		commandsRun: run.commandsRun,
	});
	if (store !== null) {
		try {
			await store.transact(opts.ns, [runFact.outcome(run.runId, run.outcome)]);
			for (const r of results) {
				if (!r.skipped && r.exitCode === 0)
					await store.transact(opts.ns, [runFact.verifiedBy(run.runId, r.cmd)]);
			}
			await store.transact(opts.ns, [runFact.reportCheck(run.runId, check.verdict)]);
		} catch (e) {
			// A ledger that will not accept the write must not change the
			// verdict — but it must not pass for a clean run either. These are
			// the run's only facts of record, and losing them silently leaves
			// the CLI reporting a completion nothing can be checked against.
			const detail = e instanceof Error ? e.message : String(e);
			opts.out.write(`warning: this run was not recorded (${detail})\n`);
		}
	}
	if (check.verdict === "BLOCK") {
		opts.out.write(`blocked: the completion report is not supported by what ah observed
`);
		for (const r of check.reasons) opts.out.write(`  - ${r}
`);
		return "blocked"; // exit 1; the run's branch keeps the code for review
	}
	for (const r of check.reasons) opts.out.write(`verify: ${r}
`);
	return "completed";
}

