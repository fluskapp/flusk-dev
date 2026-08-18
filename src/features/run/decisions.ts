/**
 * The DecisionLog: one run's account of itself, assembled from what the
 * harness wrote down WHEN IT DECIDED — decision entries in the session file —
 * plus the gate's facts of record when a store is available.
 *
 * Nothing here is derived after the fact from the transcript: a line a
 * reviewer reads names the entry or fact it came from, which is the whole
 * difference between an explanation and a story.
 */
import type { Decision, DecisionEntry, SessionEntry } from "../session/entries.js";
import type { Fact, FactStore } from "../facts/types.js";

export interface GateEvidence {
	/** verified_by rows: the commands that passed. */
	verifiedBy: string[];
	/** failed_because rows: why the gate warned or blocked, when recorded. */
	reasons: string[];
	/** The run's recorded outcome fact, when one was written. */
	outcome?: string;
	/** report_check verdict (ALLOW/WARN/BLOCK), when recorded. */
	reportCheck?: string;
}

export interface DecisionLog {
	runId: string;
	task: string;
	taskKind?: string;
	createdAt: string;
	/** In the order they were made. */
	decisions: Array<{ at: string; decision: Decision }>;
	gate: GateEvidence | null;
	endReason?: string;
}

interface HeaderLike {
	id: string;
	task: string;
	createdAt: string;
	taskKind?: string;
}

/** Pure half: everything the session alone can prove. */
export function assembleFromSession(header: HeaderLike, entries: SessionEntry[]): DecisionLog {
	const decisions = entries
		.filter((e): e is DecisionEntry => e.type === "decision")
		.map((e) => ({ at: e.at, decision: e.decision }));
	let endReason: string | undefined;
	for (const e of entries) if (e.type === "stats" && e.reason !== undefined) endReason = e.reason;
	return {
		runId: header.id,
		task: header.task,
		createdAt: header.createdAt,
		...(header.taskKind !== undefined ? { taskKind: header.taskKind } : {}),
		decisions,
		gate: null,
		...(endReason !== undefined ? { endReason } : {}),
	};
}

/** Every loop-run id this session recorded. The session id is NOT one of
 * them — the gate's ledger is keyed by run, and joining on the session id is
 * the bug this function exists to prevent recurring. */
export function runIdsOf(entries: SessionEntry[]): string[] {
	const ids: string[] = [];
	for (const e of entries) {
		if (e.type === "decision" && e.decision.kind === "run") ids.push(e.decision.runId);
	}
	return ids;
}

/** The gate's rows across this session's runs, merged: verified accumulates,
 * outcome/report take the LAST run's word — the retry that finally passed. */
export async function gateEvidence(
	store: FactStore,
	ns: string,
	runIds: string[],
): Promise<GateEvidence> {
	const out: GateEvidence = { verifiedBy: [], reasons: [] };
	for (const runId of runIds) {
		const rows: Fact[] = await store.query(ns, { subject: `Run:${runId}` });
		for (const f of rows) {
			if (f.predicate === "verified_by" && !out.verifiedBy.includes(f.object)) {
				out.verifiedBy.push(f.object);
			}
			if (f.predicate === "failed_because" && !out.reasons.includes(f.object)) {
				out.reasons.push(f.object);
			}
			if (f.predicate === "outcome") out.outcome = f.object;
			if (f.predicate === "report_check") out.reportCheck = f.object;
		}
	}
	return out;
}
