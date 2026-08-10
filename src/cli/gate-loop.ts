/**
 * The post-run verification gate shared by run, resume and goal: when a run
 * completes, run the detected verify commands; on failure steer the SAME
 * session with the evidence (agent.continueRun) up to cfg.verify.retries;
 * then, with a live memory client, claim-check the completion report.
 * Empty command list → pass-through (scratch repos stay gate-free).
 */
import type { Agent } from "../agent/options.js";
import type { HitConfig, RepoConfig } from "../config/types.js";
import { collectRunRecord } from "../core/run-record.js";
import type { RunEndReason, RunStats } from "../core/types.js";
import type { MemoryClient } from "../memory/client-types.js";
import { runFact } from "../memory/facts.js";
import type { RunRecord } from "../memory/port.js";
import { buildClaims, checkReport } from "../verify/claims.js";
import { detectVerifyCommands, persistVerifyCommands } from "../verify/detect.js";
import { formatEvidence, runVerify, type VerifyCommandResult } from "../verify/gate.js";

/** What the CLI exits on: a run end reason, or gate-blocked (exit 1). */
export type CliOutcome = RunEndReason | "blocked";

export interface GateOpts {
	cfg: HitConfig;
	repoRoot: string;
	repoConfig?: RepoConfig;
	client: MemoryClient | null;
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

const reasonOf = (details: unknown): string =>
	String((details as { reason?: unknown } | null)?.reason ?? "no details");

/** Claim-check the report; degrades to a warning when memory misbehaves. */
async function claimCheck(
	client: MemoryClient,
	opts: GateOpts,
	run: RunRecord,
	results: VerifyCommandResult[],
): Promise<"completed" | "blocked"> {
	try {
		for (const r of results) {
			// Harness-observed truth: the gate itself ran these successfully.
			if (!r.skipped && r.exitCode === 0)
				await client.transact(opts.ns, [runFact.verifiedBy(run.runId, r.cmd)]);
		}
		const { verdict, details } = await checkReport(client, opts.ns, buildClaims(run, results));
		if (verdict === "BLOCK") {
			opts.out.write(`blocked: memory contradicts the completion report — ${reasonOf(details)}\n`);
			return "blocked"; // exit 1; the run's branch keeps the code untouched
		}
		if (verdict === "WARN") opts.out.write(`verify: claim check WARN — ${reasonOf(details)}\n`);
	} catch (e) {
		opts.out.write(`verify: claim check unavailable — ${e instanceof Error ? e.message : e}\n`);
	}
	return "completed";
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
			if (opts.client !== null) {
				await persistVerifyCommands(opts.client, opts.ns, commands).catch(() => {});
			}
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
		if (opts.client === null) return { outcome: reason, reason, stats };
		const rec = track.snapshot();
		const outcome = await claimCheck(opts.client, opts, {
			runId: rec.runId,
			sessionId: agent.session.id,
			repoPath: opts.repoRoot,
			task: "",
			outcome: reason,
			filesTouched: rec.filesTouched,
			commandsRun: rec.commandsRun,
			transcriptTail: [],
			stats,
		}, results);
		return { outcome, reason, stats };
	} finally {
		track.stop();
	}
}
