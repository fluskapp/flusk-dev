/**
 * D2's precedence rule, in ONE place: the LAST gate decision entry wins — a
 * retry that finally passed appends a later "completed" gate entry over the
 * earlier blocked one. Every surface that folds gate entries (feed scan, run
 * summary, gate recording) imports this, so the folds cannot drift.
 */
import type { Decision, SessionEntry } from "./entries.js";

export type GateDecision = Extract<Decision, { kind: "gate" }>;

export function lastGate(entries: SessionEntry[]): GateDecision | null {
	let gate: GateDecision | null = null;
	for (const e of entries) {
		if (e.type === "decision" && e.decision.kind === "gate") gate = e.decision;
	}
	return gate;
}
