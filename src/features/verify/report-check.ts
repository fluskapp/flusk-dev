/**
 * Does the agent's closing report match what the harness actually saw?
 *
 * A check that confirms claims against facts the harness itself just wrote
 * from its own observations is self-fulfilling by construction, and can never
 * block. So this one compares the REPORT (the only thing the model authored)
 * against observations the model cannot forge: which commands the gate ran,
 * which exited zero, and which files the tools actually wrote.
 *
 * Bias: a false BLOCK costs one wasted run; a false ALLOW is a lie shipped
 * unattended. So verification claims block, while softer mismatches warn.
 */

export interface Observations {
	/** Verify commands the gate itself executed. */
	verify: { cmd: string; exitCode: number; skipped?: boolean }[];
	/** Paths write/edit tools actually changed. */
	filesTouched: string[];
	/** Shell commands the agent ran, with exit codes. */
	commandsRun: { cmd: string; exit: number }[];
}

export interface ReportVerdict {
	verdict: "ALLOW" | "WARN" | "BLOCK";
	reasons: string[];
}

/** "the tests pass", "all checks green", "the build succeeds", "verified". */
const CLAIMS_VERIFIED =
	/\b(tests?|test suite|checks?|build|lint|typecheck|type-check)\b[^.\n]{0,60}\b(pass(es|ed|ing)?|green|succeed(s|ed)?|clean|work(s|ing)?)\b|\ball\s+(tests|checks)\s+pass|\bverified\b|\bconfirmed\s+(?:it\s+)?works\b/i;

/** Commands whose success is real evidence of verification. */
const VERIFICATION_CMD =
	/\b(npm|pnpm|yarn|bun)\s+(run\s+)?(test|check|lint|build|typecheck)|\bvitest\b|\bjest\b|\bpytest\b|\bcargo\s+(test|check|clippy)|\bgo\s+test\b|\bmake\s+(test|check)|\btsc\b/i;

const CLAIMS_EDIT =
	/\b(added|created|updated|edited|modified|implemented|wrote|refactored|removed|deleted)\b/i;

function observedVerification(obs: Observations): boolean {
	if (obs.verify.some((r) => r.skipped !== true && r.exitCode === 0)) return true;
	return obs.commandsRun.some((c) => c.exit === 0 && VERIFICATION_CMD.test(c.cmd));
}

/**
 * Commands the report presents as having been run, taken from backticked
 * spans — the one place a report names a command unambiguously.
 */
function claimedCommands(report: string): string[] {
	const out: string[] = [];
	for (const m of report.matchAll(/`([^`\n]{2,80})`/g)) {
		const text = (m[1] ?? "").trim();
		if (VERIFICATION_CMD.test(text)) out.push(text);
	}
	return out;
}

export function checkReportText(report: string, obs: Observations): ReportVerdict {
	const reasons: string[] = [];
	let verdict: ReportVerdict["verdict"] = "ALLOW";

	if (CLAIMS_VERIFIED.test(report) && !observedVerification(obs)) {
		verdict = "BLOCK";
		reasons.push(
			"the report claims verification passed, but the harness saw no verification " +
				"command succeed (no gate command passed and no test/build command was run)",
		);
	}

	if (CLAIMS_EDIT.test(report) && obs.filesTouched.length === 0) {
		if (verdict === "ALLOW") verdict = "WARN";
		reasons.push("the report describes edits, but no file was written or edited");
	}

	for (const cmd of claimedCommands(report)) {
		const ran = obs.commandsRun.some((c) => c.cmd.includes(cmd) || cmd.includes(c.cmd));
		const gated = obs.verify.some((r) => r.cmd.includes(cmd) || cmd.includes(r.cmd));
		if (!ran && !gated) {
			if (verdict === "ALLOW") verdict = "WARN";
			reasons.push(`the report cites \`${cmd}\`, which the harness never ran`);
		}
	}

	return { verdict, reasons };
}
