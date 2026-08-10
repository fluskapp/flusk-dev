/**
 * The unattended loop: tick, sleep, repeat. Bounded by `maxTicks` (tests and
 * `--once` use it) or by an abort signal; the night cap and per-item
 * cooldowns live in the ledger, not here.
 */
import { type TickResult, type WatchDeps, watchTick } from "./tick.js";

export interface LoopOpts {
	/** Stop after this many ticks. Infinity for a real overnight run. */
	maxTicks?: number;
	signal?: AbortSignal;
	sleep(ms: number): Promise<void>;
}

export interface LoopSummary {
	ticks: number;
	ran: number;
	completed: number;
	results: TickResult[];
}

export async function watchLoop(deps: WatchDeps, opts: LoopOpts): Promise<LoopSummary> {
	const maxTicks = opts.maxTicks ?? Number.POSITIVE_INFINITY;
	const idleMs = deps.cfg.watch.pollIntervalMinutes * 60_000;
	const summary: LoopSummary = { ticks: 0, ran: 0, completed: 0, results: [] };
	// A call, not a field read: `aborted` flips during the loop body and must
	// not be narrowed away by the loop condition.
	const aborted = (): boolean => opts.signal?.aborted === true;

	while (summary.ticks < maxTicks && !aborted()) {
		// A tick that throws (an abagraph hiccup, a git surprise) logs and the
		// night continues; only an abort or maxTicks stops the loop.
		let result: TickResult;
		try {
			result = await watchTick(deps);
		} catch (e) {
			deps.log(`tick failed: ${e instanceof Error ? e.message : String(e)}`);
			result = { status: "idle" };
		}
		summary.ticks++;
		summary.results.push(result);
		if (result.status === "ran") {
			summary.ran++;
			if (result.outcome === "completed") summary.completed++;
		}
		if (summary.ticks >= maxTicks || aborted()) break;
		// A tick that worked an item earned its keep; poll again immediately.
		// Idle and capped ticks wait, so an empty queue is not a spin loop.
		if (result.status !== "ran") await opts.sleep(idleMs);
	}
	return summary;
}
