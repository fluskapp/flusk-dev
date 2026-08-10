import type { RunEndReason } from "./types.js";

export interface Limits {
	maxTurns: number;
	deadlineMs?: number;
}

/**
 * Pure stop check evaluated before each turn. Returns the run end reason
 * when a limit is ah, null to continue. Time is injected for testability.
 */
export function checkStop(
	turnsCompleted: number,
	startedAtMs: number,
	limits: Limits,
	nowMs: number,
): RunEndReason | null {
	if (turnsCompleted >= limits.maxTurns) return "maxTurns";
	if (limits.deadlineMs !== undefined && nowMs - startedAtMs >= limits.deadlineMs) {
		return "deadline";
	}
	return null;
}
