/**
 * Pure status/verdict derivation shared by the session scanner, split out so
 * the repository file holds only I/O and caching. No node:* imports.
 */
import type { AssistantMsg, RunEndReason } from "../run/run.types.js";

export { type GateDecision, lastGate } from "../session/gate-fold.js";

export type SessionStatus = "completed" | "error" | "aborted" | "stopped" | "running" | "blocked";

/** Newer files persist the RunEndReason in the stats entry; map it directly. */
export function statusFromReason(reason: RunEndReason): SessionStatus {
	switch (reason) {
		case "completed":
			return "completed";
		case "error":
			return "error";
		case "aborted":
			return "aborted";
		default:
			return "stopped"; // budget/maxTurns/deadline
	}
}

/**
 * The session file doesn't persist RunEndReason; derive a display status.
 *
 * "running" here means only "the file was never closed" — a crashed run says
 * it forever, and this function has no clock to know better. Whether that run
 * is still LIVE is decided once, against its last write, by run/liveness.ts;
 * every surface that counts or pulses a row asks that instead of this.
 */
export function deriveStatus(
	hasStats: boolean,
	lastAssistant: AssistantMsg | undefined,
): SessionStatus {
	if (!hasStats) return "running";
	switch (lastAssistant?.stopReason) {
		case "end":
			return "completed";
		case "error":
			return "error";
		case "aborted":
			return "aborted";
		default:
			return "stopped"; // ended on toolUse: maxTurns/deadline/budget
	}
}
