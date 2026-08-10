import type { Usage } from "../core/types.js";

export interface BudgetLimits {
	maxCostUsd: number;
	deadlineMs: number | null;
}

/**
 * Accumulates spend across turns and reports the first breached limit.
 * Breaches trip at >= so a run halts the moment a limit is reached — for
 * unattended overnight runs, stopping early always beats overspending.
 */
export class BudgetTracker {
	private spent = 0;

	constructor(
		private readonly limits: BudgetLimits,
		private readonly startMs: number,
	) {}

	record(usage: Usage): void {
		this.spent += usage.costUsd;
	}

	spentUsd(): number {
		return this.spent;
	}

	breach(nowMs: number): "budget" | "deadline" | null {
		if (this.spent >= this.limits.maxCostUsd) return "budget";
		if (this.limits.deadlineMs !== null && nowMs - this.startMs >= this.limits.deadlineMs) {
			return "deadline";
		}
		return null;
	}
}
