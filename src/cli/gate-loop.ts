/**
 * The post-run verification gate shared by run, resume and goal: when a run
 * completes, run the detected verify commands; on failure steer the SAME
 * session with the evidence (agent.continueRun) up to cfg.verify.retries;
 * then claim-check the completion report and record the verdict.
 * Empty command list → pass-through (scratch repos stay gate-free).
 */
import type { Agent } from "../features/run/options.js";
import type { FluskConfig, RepoConfig } from "../platform/config/types.js";
import { collectRunRecord } from "../features/run/run-record.js";
import type { RunEndReason, RunStats } from "../features/run/run.types.js";
import type { FactStore } from "../features/facts/types.js";
import { detectVerifyCommands } from "../features/verify/detect.repository.js";
import { formatEvidence, runVerify, type VerifyCommandResult } from "../features/verify/gate.repository.js";
import { claimCheck, finalReport } from "./gate-report.js";

/** What the CLI exits on: a run end reason, or gate-blocked (exit 1). */
export type CliOutcome = RunEndReason | "blocked";

export interface GateOpts {
	cfg: FluskConfig;
	repoRoot: string;
	repoConfig?: RepoConfig;
	/** null when the caller keeps no record (memory disabled): the gate still
	 * runs, it just writes nothing down. */
	store: FactStore | null;
	ns: string;
	out: NodeJS.WritableStream;
	/** --no-verify: skip the whole gate (commands AND claim check). */
	noVerify?: boolean;
}

/** Tracks the CURRENT attempt's run id + evidence trail off the event bus. */
function trackAttempts(agent: Agent, repoRoot: string) {
	let runId = "";
	let rec = collectRunRecord(agent.events, repoRoot);
	const off = agent.events.on("run:start", (e) => {
		runId = e.runId;
		rec.stop();
		rec = collectRunRecord(agent.events, repoRoot);
	});
	return {
		snapshot: () => ({ runId, filesTouched: rec.filesTouched, commandsRun: rec.commandsRun }),
		stop: () => {
			rec.stop();
			off();
		},
	};
}

function failure(results: VerifyCommandResult[]): VerifyCommandResult | undefined {
	return results.find((r) => !r.skipped && r.exitCode !== 0);
}

/** Runs the agent, then the gate. Returns the final CLI outcome plus the
 * last attempt's reason/stats (for the stats line). Never throws mid-gate. */
export async function runWithGate(
	agent: Agent,
	opts: GateOpts,
): Promise<{ outcome: CliOutcome; reason: RunEndReason; stats: RunStats }> {
	const track = trackAttempts(agent, opts.repoRoot);
	try {
		let { reason, stats } = await agent.run();
		if (reason !== "completed" || opts.noVerify === true) return { outcome: reason, reason, stats };
		const commands = detectVerifyCommands(opts.repoRoot, opts.repoConfig);
		let results: VerifyCommandResult[] = [];
		if (commands.length > 0) {
			let verdict = runVerify(commands, opts.repoRoot, opts.cfg.verify.evidenceLines);
			for (let retry = 0; !verdict.passed; retry++) {
				if (retry >= opts.cfg.verify.retries) {
					const f = failure(verdict.results);
					opts.out.write(`blocked: verification failing after ${retry} retries\n`);
					if (f !== undefined) opts.out.write(`${f.cmd} exited ${f.exitCode}\n${f.tail}\n`);
					return { outcome: "blocked", reason, stats };
				}
				({ reason, stats } = await agent.continueRun(formatEvidence(verdict.results)));
				if (reason !== "completed") return { outcome: reason, reason, stats };
				verdict = runVerify(commands, opts.repoRoot, opts.cfg.verify.evidenceLines);
			}
			results = verdict.results;
		}
		const rec = track.snapshot();
		const report = finalReport(agent);
		const outcome = await claimCheck(opts.store, opts, {
			runId: rec.runId,
			sessionId: agent.session.id,
			repoPath: opts.repoRoot,
			task: "",
			outcome: reason,
			filesTouched: rec.filesTouched,
			commandsRun: rec.commandsRun,
			transcriptTail: [],
			stats,
		}, results, report);
		return { outcome, reason, stats };
	} finally {
		track.stop();
	}
}
