/**
 * The completion check: read the agent's closing report and test it against
 * what the harness observed, then record the verdict for the audit trail.
 */
import type { Agent } from "../agent/options.js";
import type { MemoryClient } from "../memory/client-types.js";
import { runFact } from "../memory/facts.js";
import type { RunRecord } from "../memory/port.js";
import type { VerifyCommandResult } from "../verify/gate.js";
import { checkReportText } from "../verify/report-check.js";
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
 * Check the report against what the harness observed, then record the verdict
 * in memory for the audit trail. Memory is the LEDGER here, not the judge:
 * asking it to confirm facts the harness itself just wrote is circular, and
 * its route answers missing evidence with WARN — see docs/review-findings.md.
 */
export async function claimCheck(
	client: MemoryClient | null,
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
	// The verdict comes from observations alone, so it still applies when
	// memory is down — gating this behind a live ledger would drop the check
	// exactly when abagraph is unreachable, which is the common case.
	if (client !== null) {
		try {
			for (const r of results) {
				if (!r.skipped && r.exitCode === 0)
					await client.transact(opts.ns, [runFact.verifiedBy(run.runId, r.cmd)]);
			}
			await client.transact(opts.ns, [runFact.reportCheck(run.runId, check.verdict)]);
		} catch {
			// An unreachable ledger must not change the verdict.
		}
	}
	if (check.verdict === "BLOCK") {
		opts.out.write(`blocked: the completion report is not supported by what hit observed
`);
		for (const r of check.reasons) opts.out.write(`  - ${r}
`);
		return "blocked"; // exit 1; the run's branch keeps the code for review
	}
	for (const r of check.reasons) opts.out.write(`verify: ${r}
`);
	return "completed";
}

