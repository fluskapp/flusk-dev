/**
 * The verification gate: run the verify commands sequentially, stop at the
 * first failure, and turn a failure into a steering message for the agent.
 * Pure process logic — no memory dependency.
 */
import { spawnSync } from "node:child_process";

const COMMAND_TIMEOUT_MS = 5 * 60 * 1000;

export interface VerifyCommandResult {
	cmd: string;
	exitCode: number;
	/** Last N lines of combined stdout+stderr (N = config verify.evidenceLines). */
	tail: string;
	/** True for commands never run because an earlier one failed. */
	skipped?: boolean;
}

export interface VerifyOutcome {
	passed: boolean;
	results: VerifyCommandResult[];
}

export function runVerify(commands: string[], cwd: string, evidenceLines: number): VerifyOutcome {
	const results: VerifyCommandResult[] = [];
	let failed = false;
	for (const cmd of commands) {
		if (failed) {
			results.push({ cmd, exitCode: -1, tail: "", skipped: true });
			continue;
		}
		const out = spawnSync("/bin/sh", ["-c", cmd], {
			cwd,
			timeout: COMMAND_TIMEOUT_MS,
			encoding: "utf8",
		});
		// status is null on timeout/spawn-error; report those as -1, not success.
		const exitCode = out.status ?? -1;
		const tail = lastLines(`${out.stdout ?? ""}${out.stderr ?? ""}`, evidenceLines);
		results.push({ cmd, exitCode, tail });
		if (exitCode !== 0) failed = true;
	}
	return { passed: !failed, results };
}

/** Steering message for the agent when verification failed; "" when it passed. */
export function formatEvidence(results: VerifyCommandResult[]): string {
	const failure = results.find((r) => !r.skipped && r.exitCode !== 0);
	if (!failure) return "";
	return [
		`Verification failed: ${failure.cmd} exited ${failure.exitCode}`,
		failure.tail,
		"Fix the failures, run the command yourself to confirm, then finish.",
	]
		.filter((part) => part.length > 0)
		.join("\n");
}

function lastLines(text: string, n: number): string {
	const trimmed = text.replace(/\n$/, "");
	if (trimmed === "") return "";
	const lines = trimmed.split("\n");
	return lines.slice(Math.max(0, lines.length - n)).join("\n");
}
