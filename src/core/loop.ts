import type { BudgetTracker } from "../safety/budget.js";
import { collectRunRecord } from "./run-record.js";
import { checkStop, type Limits } from "./stop.js";
import { runTurn, type TurnDeps, type TurnState } from "./turn.js";
import type { Msg, RunEndReason, RunStats } from "./types.js";
import { zeroUsage } from "./types.js";

export interface LoopDeps extends TurnDeps {
	limits: Limits;
	initialContext: Msg[];
	/** Cost/deadline tracker; absent = no budget wrap-up (bare test loops). */
	budget?: BudgetTracker;
	/** Clock injection for deterministic deadline tests. */
	now?: () => number;
}

const WRAP_UP_MSG =
	"Budget limit reached — stop after this message: summarize what was done and what remains; do not call more tools.";

/**
 * The run loop: run:start, turns until a stop/end reason, then run:end and
 * exactly one memory.postRun for every outcome.
 */
export async function runLoop(deps: LoopDeps): Promise<{ reason: RunEndReason; stats: RunStats }> {
	const now = deps.now ?? Date.now;
	const startedAtMs = now();
	await deps.events.emit({
		type: "run:start",
		runId: deps.runId,
		task: deps.task,
		model: deps.model,
	});
	const record = collectRunRecord(deps.events, deps.toolCtx.cwd);
	const state: TurnState = { context: [...deps.initialContext], turn: 1, usage: zeroUsage() };
	let turnsCompleted = 0;
	let reason: RunEndReason;
	try {
		let next: RunEndReason | null = null;
		let wrapReason: RunEndReason | null = null;
		let wrapPending = false;
		while (next === null) {
			if (deps.signal.aborted) {
				next = "aborted";
				break;
			}
			// A pending wrap-up turn always runs; checkStop would preempt it.
			const stop = wrapPending ? null : checkStop(turnsCompleted, startedAtMs, deps.limits, now());
			if (stop !== null) {
				next = stop;
				break;
			}
			const costBefore = state.usage.costUsd;
			const result = await runTurn(deps, state);
			turnsCompleted += 1;
			state.turn = turnsCompleted + 1;
			deps.budget?.record({ ...zeroUsage(), costUsd: state.usage.costUsd - costBefore });
			if (wrapPending) {
				// The one wrap-up turn has run: end with the breach reason
				// regardless of tool calls, keeping only genuine failures.
				next = result === "error" || result === "aborted" ? result : (wrapReason ?? "maxTurns");
				break;
			}
			next = result;
			if (next !== null) continue;
			const breach = deps.budget?.breach(now()) ?? null;
			if (breach !== null || turnsCompleted === deps.limits.maxTurns - 1) {
				wrapReason = breach ?? "maxTurns";
				wrapPending = true;
				const msg: Msg = { role: "user", content: WRAP_UP_MSG };
				deps.session.appendMessage(msg);
				state.context.push(msg);
			}
		}
		reason = next;
	} catch (e) {
		// An escaped exception (session write, memory.preTurn, event listener)
		// must not skip the stats append, run:end, and the single postRun below.
		reason = "error";
		const errorMessage = e instanceof Error ? e.message : String(e);
		try {
			deps.session.appendMessage({
				role: "assistant",
				content: [],
				stopReason: "error",
				errorMessage,
				usage: zeroUsage(),
			});
		} catch {
			// the session itself may be the failing component; the error reason stands
		}
	}
	try {
		// Persist steering that arrived too late to influence a turn, for resume.
		for (const msg of deps.steering.drain()) {
			deps.session.appendMessage(msg);
		}
	} catch {
		// best-effort only
	}
	const stats: RunStats = {
		turns: turnsCompleted,
		usage: state.usage,
		startedAt: new Date(startedAtMs).toISOString(),
		endedAt: new Date(now()).toISOString(),
	};
	try {
		deps.session.appendStats(stats, reason);
	} catch {
		// a failed stats write must not skip the run:end emit or postRun
	}
	try {
		await deps.events.emit({ type: "run:end", reason, stats });
	} catch {
		// never let a listener failure skip the single postRun
	}
	record.stop();
	await deps.memory.postRun({
		runId: deps.runId,
		sessionId: deps.session.id,
		repoPath: deps.repoPath,
		task: deps.task,
		outcome: reason,
		filesTouched: record.filesTouched,
		commandsRun: record.commandsRun,
		transcriptTail: state.context.slice(-10),
		stats,
	});
	return { reason, stats };
}
