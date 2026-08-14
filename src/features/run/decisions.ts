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

/** The gate's rows for this run, read from the store's facts of record. */
export async function gateEvidence(
	store: FactStore,
	ns: string,
	runId: string,
): Promise<GateEvidence> {
	const rows: Fact[] = await store.query(ns, { subject: `Run:${runId}` });
	const verifiedBy = rows.filter((f) => f.predicate === "verified_by").map((f) => f.object);
	const outcome = rows.find((f) => f.predicate === "outcome")?.object;
	const reportCheck = rows.find((f) => f.predicate === "report_check")?.object;
	return {
		verifiedBy,
		...(outcome !== undefined ? { outcome } : {}),
		...(reportCheck !== undefined ? { reportCheck } : {}),
	};
}
