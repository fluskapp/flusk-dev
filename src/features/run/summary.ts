/**
 * The run page's Summary block: what one run left behind, in one glance.
 * Every field is harness-observed — session entries the store wrote, plus the
 * gate's facts of record — never the model's closing prose. Tool counts
 * replay persisted message entries under the same rules run-record.ts applies
 * live off the event bus, so the two views cannot disagree.
 */
import { resolve } from "node:path";
import { loadConfig, loadRepoConfig } from "../../platform/config/config.js";
import { createFactStore } from "../facts/facts.repository.js";
import { resolveNamespace } from "../facts/namespaces.js";
import type { SessionEntry } from "../session/entries.js";
import { SessionStore } from "../session/session.repository.js";
import { gateEvidence, type GateEvidence } from "./decisions.js";

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
	/** One sentence; every clause names a field above, absent clauses omitted. */
	conclusion: string;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** run-record.ts's counting rules, replayed over persisted message entries:
 * bash exits parsed from the "[exit code N]" output tail, writes/edits by
 * resolved path, deduplicated. */
function replayTools(entries: SessionEntry[], cwd: string) {
	const argsById = new Map<string, Record<string, unknown>>();
	const filesTouched: string[] = [];
	const commandsRun: Array<{ cmd: string; exit: number }> = [];
	for (const e of entries) {
		if (e.type !== "message") continue;
		const m = e.msg;
		if (m.role === "assistant") {
			for (const b of m.content) {
				if (b.type === "toolCall" && isObj(b.args)) argsById.set(b.id, b.args);
			}
		} else if (m.role === "toolResult") {
			const args = argsById.get(m.callId);
			argsById.delete(m.callId);
			if (m.name === "bash" && typeof args?.command === "string") {
				const exit = m.output.match(/\[exit code (\d+)\]\s*$/);
				commandsRun.push({ cmd: args.command, exit: exit ? Number(exit[1]) : m.isError ? 1 : 0 });
			} else if ((m.name === "write" || m.name === "edit") && !m.isError) {
				if (typeof args?.file_path !== "string") continue;
				const path = resolve(cwd, args.file_path);
				if (!filesTouched.includes(path)) filesTouched.push(path);
			}
		}
	}
	return { filesTouched, commandsRun };
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
	const fields = {
		outcome,
		turns,
		costUsd,
		model: `${header.model.provider}/${header.model.id}`,
		...replayTools(entries, header.repoRoot),
		verified: gate?.verifiedBy ?? [],
		reportCheck: gate?.reportCheck ?? null,
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
	return assembleRunSummary(entries, await gateEvidence(createFactStore(), ns, header.id));
}
