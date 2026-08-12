import type { BudgetTracker } from "../safety/budget.js";
import { checkStop, type Limits } from "./stop.js";
import { runTurn, type TurnDeps, type TurnState } from "./turn.js";
import type { Msg, RunEndReason, RunStats } from "./types.js";
import { zeroUsage } from "./types.js";

export interface LoopDeps extends TurnDeps {
	limits: Limits;
	initialContext: Msg[];
	/**
	 * Called once, after run:start and before the first turn, to report what the
	 * run was given (the context block). It runs here rather than at the caller
	 * so the report lands INSIDE the run it describes; it is awaited so a
	 * subscriber sees it before any turn event, and it cannot fail the run.
	 */
	announce?: () => Promise<void>;
	/** Cost/deadline tracker; absent = no budget wrap-up (bare test loops). */
	budget?: BudgetTracker;
	/** Clock injection for deterministic deadline tests. */
	now?: () => number;
}

const WRAP_UP_MSG =
	"Budget limit reached — stop after this message: summarize what was done and what remains; do not call more tools.";

/**
 * The run loop: run:start, turns until a stop/end reason, then the stats
 * append and exactly one run:end for every outcome — including the outcomes
 * nobody wants, which is why the ending is in a finally-shaped tail rather
 * than on the success path.
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
	try {
		await deps.announce?.();
	} catch {
		// A listener that throws is its own problem; what the run was given is a
		// report, and a failed report must not cost the run its turns.
	}
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
		// An escaped exception (session write, event listener) must not skip the
		// stats append and run:end below.
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
		// a failed stats write must not skip the run:end emit
	}
	try {
		await deps.events.emit({ type: "run:end", reason, stats });
	} catch {
		// a listener that throws is its own problem; the run still ended
	}
	return { reason, stats };
}
