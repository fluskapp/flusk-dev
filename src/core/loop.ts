import { checkStop, type Limits } from "./stop.js";
import { runTurn, type TurnDeps, type TurnState } from "./turn.js";
import type { Msg, RunEndReason, RunStats } from "./types.js";
import { zeroUsage } from "./types.js";

export interface LoopDeps extends TurnDeps {
	limits: Limits;
	initialContext: Msg[];
}

/**
 * The run loop: run:start, turns until a stop/end reason, then run:end and
 * exactly one memory.postRun for every outcome.
 */
export async function runLoop(deps: LoopDeps): Promise<{ reason: RunEndReason; stats: RunStats }> {
	const startedAtMs = Date.now();
	await deps.events.emit({
		type: "run:start",
		runId: deps.runId,
		task: deps.task,
		model: deps.model,
	});
	const state: TurnState = { context: [...deps.initialContext], turn: 1, usage: zeroUsage() };
	let turnsCompleted = 0;
	let reason: RunEndReason;
	try {
		let next: RunEndReason | null = null;
		while (next === null) {
			if (deps.signal.aborted) {
				next = "aborted";
				break;
			}
			const stop = checkStop(turnsCompleted, startedAtMs, deps.limits, Date.now());
			if (stop !== null) {
				next = stop;
				break;
			}
			next = await runTurn(deps, state);
			turnsCompleted += 1;
			state.turn = turnsCompleted + 1;
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
		endedAt: new Date().toISOString(),
	};
	try {
		deps.session.appendStats(stats);
		await deps.events.emit({ type: "run:end", reason, stats });
	} catch {
		// never let a stats write or listener failure skip the single postRun
	}
	await deps.memory.postRun({
		runId: deps.runId,
		sessionId: deps.session.id,
		repoPath: deps.repoPath,
		task: deps.task,
		outcome: reason,
		filesTouched: [],
		commandsRun: [],
		transcriptTail: state.context.slice(-10),
		stats,
	});
	return { reason, stats };
}
