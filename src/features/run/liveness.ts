/**
 * Liveness aging — the ONE place that decides whether a "running" row is
 * actually running.
 *
 * A crashed run never closes its session file (no stats entry reads as
 * "running" forever) and a dead orchestrator never rewrites its journal
 * frontmatter, so status alone keeps a week-old corpse pulsing on the
 * dashboard. The rule is the attention rules' own window: nothing has WRITTEN
 * to the run in an hour, so nobody is driving it — the row reads "stalled",
 * dim, and stops counting as live everywhere at once (Overview tiles, tree
 * badges, toolbar chip, the Runs Live section).
 *
 * Zero imports (the verdict.types.ts precedent): features, routes and the
 * client bundle all read the same number.
 */

/** A run still "running" this long after its last write is stalled, not busy. */
export const STALL_MS = 60 * 60_000;

/** What a demoted row reads as — an unknown ending, never a claimed failure.
 * statusToVerdict has no case for it, so it takes the dim "none" pill. */
export const STALLED = "stalled";

/** Nothing has touched the run since the window. A stamp in the FUTURE (clock
 * skew, a fixture dated ahead) is never stale — a row is dimmed on evidence. */
export function isStale(lastWriteMs: number, nowMs: number = Date.now()): boolean {
	return Number.isFinite(lastWriteMs) && nowMs - lastWriteMs > STALL_MS;
}

/** The live test every surface counts with: claimed running AND recently written. */
export function isLive(status: string, lastWriteMs: number, nowMs: number = Date.now()): boolean {
	return status === "running" && !isStale(lastWriteMs, nowMs);
}

/** "running" past the window becomes "stalled"; every other status is itself. */
export function ageStatus(status: string, lastWriteMs: number, nowMs: number = Date.now()): string {
	return status === "running" && isStale(lastWriteMs, nowMs) ? STALLED : status;
}
