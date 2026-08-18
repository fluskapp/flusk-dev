/**
 * The run page's Summary block: what one run left behind, in one glance.
 * Every field is harness-observed — session entries the store wrote, plus the
 * gate's facts of record — never the model's closing prose. Tool counts
 * replay persisted message entries under the same rules run-record.ts applies
 * live off the event bus, so the two views cannot disagree.
 */
import { loadConfig, loadRepoConfig } from "../../platform/config/config.js";
import { createFactStore } from "../facts/facts.repository.js";
import { resolveNamespace } from "../facts/namespaces.js";
import type { SessionEntry } from "../session/entries.js";
import { lastGate } from "../session/gate-fold.js";
import { SessionStore } from "../session/session.repository.js";
import { gateEvidence, type GateEvidence, runIdsOf } from "./decisions.js";
import { replayTools } from "./replay-tools.js";
import { runVerdict, type Verdict } from "./verdict.types.js";

export interface RunSummary {
	/** Why the run ended (stats entry); null while it is still running. */
	outcome: string | null;
	turns: number | null;
	costUsd: number | null;
	/** "provider/id" the harness resolved at start (header entry). */
	model: string;
	filesTouched: string[];
	commandsRun: Array<{ cmd: string; exit: number }>;
	/** verified_by facts: the commands the gate saw pass. */
	verified: string[];
	/** report_check verdict (ALLOW/WARN/BLOCK), when the gate recorded one. */
	reportCheck: string | null;
	/** Unified verdict (verdict.types.ts): end reason + gate record, one answer. */
	verdict: Verdict;
	/** Gate retries consumed (0 = clean first pass); null when no gate entry recorded them. */
	retries: number | null;
	/** Why the gate warned/blocked: the gate entry's reasons, failed_because facts for old runs. */
	reasons: string[];
	/** Context rebuilds persisted in this session's JSONL. */
	compactions: number;
	/** Where the gate story came from — drives the honest-absence line. */
	gateSource: "entry" | "facts" | "memory-off" | "none";
	/** One sentence; every clause names a field above, absent clauses omitted. */
	conclusion: string;
}

/** format.ts's fmtCost formula, kept identical so both surfaces print one number. */
const fmtCost = (n: number): string => `$${Math.round(n * 10000) / 10000}`;
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The assembled sentence: a clause per field that exists, nothing invented. */
function conclude(s: Omit<RunSummary, "conclusion">): string {
	const clauses: string[] = [];
	if (s.outcome !== null) {
		let head = s.outcome.charAt(0).toUpperCase() + s.outcome.slice(1);
		if (s.turns !== null) head += ` in ${plural(s.turns, "turn")}`;
		if (s.costUsd !== null) head += ` for ${fmtCost(s.costUsd)}`;
		clauses.push(head);
	}
	if (s.filesTouched.length > 0) clauses.push(`touched ${plural(s.filesTouched.length, "file")}`);
	if (s.verified.length > 0) clauses.push(`gate passed ${plural(s.verified.length, "command")}`);
	if (s.reportCheck !== null) clauses.push(`report check ${s.reportCheck}`);
	return clauses.length === 0 ? "No harness observations recorded yet." : `${clauses.join("; ")}.`;
}

/** RunEndReason → the status grammar verdict.types.ts speaks: a budget/maxTurns/
 * deadline stop is D1's "stopped" (warn); no stats entry yet means running. */
function verdictStatus(outcome: string | null): string {
	if (outcome === null) return "running";
	return outcome === "budget" || outcome === "maxTurns" || outcome === "deadline"
		? "stopped"
		: outcome;
}

/** Pure half: session entries (header first) + the gate's rows, already read. */
export function assembleRunSummary(entries: SessionEntry[], gate: GateEvidence | null): RunSummary {
	const header = entries[0];
	if (header?.type !== "header") throw new Error("not a session: no header entry");
	let outcome: string | null = null;
	let turns: number | null = null;
	let costUsd: number | null = null;
	for (const e of entries) {
		if (e.type !== "stats") continue;
		turns = e.stats.turns;
		costUsd = e.stats.usage.costUsd;
		if (e.reason !== undefined) outcome = e.reason;
	}
	// Entry-over-facts precedence (D4): the session file is the primary store;
	// facts are the fallback for pre-gate-entry sessions with memory on.
	const entry = lastGate(entries);
	const hasFacts =
		gate !== null &&
		(gate.verifiedBy.length > 0 || gate.outcome !== undefined || gate.reportCheck !== undefined);
	const g = {
		outcome: entry?.outcome ?? gate?.outcome,
		reportCheck: entry?.reportCheck ?? gate?.reportCheck,
	};
	const fields = {
		outcome,
		turns,
		costUsd,
		model: `${header.model.provider}/${header.model.id}`,
		...replayTools(entries, header.repoRoot),
		verified: entry?.verified ?? gate?.verifiedBy ?? [],
		reportCheck: entry?.reportCheck ?? gate?.reportCheck ?? null,
		verdict: runVerdict(verdictStatus(outcome), g),
		retries: entry?.retries ?? null,
		reasons: entry?.reasons ?? gate?.reasons ?? [],
		compactions: entries.filter((e) => e.type === "compaction").length,
		gateSource: (entry !== null
			? "entry"
			: gate === null
				? "memory-off"
				: hasFacts
					? "facts"
					: "none") as RunSummary["gateSource"],
	};
	return { ...fields, conclusion: conclude(fields) };
}

/** Composition half, mirroring explain-cmd.ts's explainSession: read the
 * session, add the gate's facts when memory is on. A pure read — no lock is
 * taken, so summarizing a LIVE run is safe. */
export async function summarizeSession(path: string): Promise<RunSummary> {
	const entries = SessionStore.read(path);
	const header = entries[0];
	if (header?.type !== "header") throw new Error(`not a session file: ${path}`);
	if (!loadConfig(header.repoRoot).memory.enabled) return assembleRunSummary(entries, null);
	const ns = resolveNamespace(header.repoRoot, loadRepoConfig(header.repoRoot));
	return assembleRunSummary(entries, await gateEvidence(createFactStore(), ns, runIdsOf(entries)));
}
