/**
 * Where a flow run is written down — in the two places flusk already looks.
 * Facts go through the fact store as ordinary `Run:` rows (outcome, stage,
 * failed_because — src/store/facts.ts): a flow run IS a run, so it needs no new
 * predicate and no new reader. Steps land on the coexist `stage` row, the shape
 * journal ingest writes and the graph view already collapses. The journal is a
 * harness-shaped markdown file under the project's `docs/runs/`, byte-
 * compatible with src/ui/journal-frontmatter.ts, so flow runs show up in the
 * workbench Runs view beside every other harness with no new UI.
 *
 * Nothing here throws: recording an outcome is never worth failing the run
 * that produced it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fact } from "../facts/facts.js";
import { resolveNamespace } from "../facts/namespaces.js";
import type { FactInput, FactStore } from "../facts/types.js";
import { runFact } from "../verify/run-facts.js";
import { clean, journalName, journalText } from "./journal.js";
import type { FlowResult } from "./types.js";

export interface FlowRecordCfg {
	repoRoot: string;
	store?: FactStore | null;
	/** Defaults to the repo namespace (src/store/namespaces.ts). */
	ns?: string;
	/** Subject of the `Run:` facts; defaults to one derived from the run. */
	runId?: string;
}

export const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
export const startedAtOf = (r: FlowResult): string =>
	r.state.steps[0]?.startedAt ?? new Date().toISOString();

/** The sortable stamp every flow id and journal name is built from. */
export const runStamp = (iso = new Date().toISOString()): string =>
	iso.slice(0, 19).replace(/[T:]/g, "-");

/** THE run id format, so the CLI's and the runtime's fallback cannot drift. */
export const newRunId = (spec: string): string => `flow-${spec}-${runStamp()}`;

/** Stable per run: the flow, when it started, and how it ended. */
export function flowRunId(r: FlowResult): string {
	return `flow-${r.spec}-${runStamp(startedAtOf(r))}`;
}

function factsFor(r: FlowResult, runId: string): FactInput[] {
	const out: FactInput[] = [runFact.outcome(runId, r.outcome)];
	for (const s of r.state.steps) {
		out.push(fact(`Run:${runId}`, "stage", `${s.nodeId}:${s.ok ? "done" : "failed"}`));
		if (!s.ok) out.push(fact(`Run:${runId}`, "failed_because", clean(`${s.nodeId}: ${s.note ?? "failed"}`)));
	}
	return out;
}

/** Writes the journal, then the facts — best-effort on both halves. */
export async function recordFlowRun(
	result: FlowResult,
	cfg: FlowRecordCfg,
): Promise<{ journalPath: string; runId: string; facts: number; notes: string[] }> {
	const notes: string[] = [];
	const runId = cfg.runId ?? flowRunId(result);
	let journalPath = "";
	try {
		const dir = join(cfg.repoRoot, "docs", "runs");
		await mkdir(dir, { recursive: true });
		journalPath = join(dir, journalName(result, runId));
		await writeFile(journalPath, journalText(result, runId), "utf8");
	} catch (err) {
		journalPath = "";
		notes.push(`journal not written: ${errText(err)}`);
	}
	let facts = 0;
	if (cfg.store) {
		const ns = cfg.ns ?? resolveNamespace(cfg.repoRoot);
		const seen = new Set<string>();
		try {
			for (const f of factsFor(result, runId)) {
				const key = `${f.subject}|${f.predicate}|${f.object}`;
				if (seen.has(key)) continue;
				seen.add(key);
				// One assert per transact: the store refuses two asserts on the same
				// (subject, predicate) in one call, even for coexist rows.
				await cfg.store.transact(ns, [f]);
				facts++;
			}
		} catch (err) {
			notes.push(`facts not recorded: ${errText(err)}`);
		}
	}
	return { journalPath, runId, facts, notes };
}
