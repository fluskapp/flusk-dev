/**
 * Recent flow runs, read back from the runtime's own crash log.
 *
 * The checkpoints under `<fluskHome>/flows/checkpoints/<runId>/steps.jsonl`
 * (src/lang/checkpoint.ts) are the only record that keeps every step's OUTPUT,
 * so they — not the journals — are what the Flows panel lists. A checkpoint
 * does not know which project it ran in, so the run journal that the same run
 * wrote (`kind: "flow"`, `tool: <flow>`) supplies that, matched on flow name
 * and start time; an unmatched run still lists, it just has no project.
 *
 * Prompt SOURCES are not checkpointed either; recomposing them for one run's
 * detail is flow-sources.ts.
 */
import { readdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { FluskConfig } from "../config/types.js";
import { checkpointDir, readCheckpoint } from "../lang/checkpoint-read.js";
import { lastAttempts } from "../lang/nodes.js";
import type { NodeKind } from "../lang/types.js";
import { scanJournals } from "./journal-scan.js";

export interface FlowRunStep {
	nodeId: string;
	kind: NodeKind;
	at: string;
	ok: boolean;
	output: string;
	promptTokens: number;
	costUsd: number;
	note?: string;
	/** Only on a single run's detail: where that step's prompt came from. */
	sources?: string[];
	/** True when that prompt's evidence came from outside the run's project. */
	widened?: boolean;
}

export interface FlowRunRow {
	runId: string;
	flow: string;
	task: string;
	at: string;
	status: "done" | "failed" | "running";
	project: string;
	costUsd: number;
	/** The run's journal, when one was matched — the handle the Runs view opens. */
	ref?: string;
	steps: FlowRunStep[];
}

export const DEFAULT_RUNS = 40;
/** How far a journal's start may sit from its run's, before it is not that run. */
const JOIN_MS = 300_000;
/** A step's output is a transcript, not a file: enough to read, not to choke on. */
const OUTPUT_MAX = 4000;

/** One owner for the checkpoint path: the runs root is its parent. */
const runsRoot = (): string => dirname(checkpointDir("x"));

/** One run by id, or null when nothing was checkpointed under that name. */
export async function flowRun(runId: string): Promise<FlowRunRow | null> {
	const lines = await readCheckpoint(runId);
	const head = lines.find((l) => l.type === "run");
	if (head === undefined || head.type !== "run") return null;
	const steps: FlowRunStep[] = lines
		.filter((l) => l.type === "step")
		.map(({ type: _kept, ...step }) => ({ ...step, output: step.output.slice(0, OUTPUT_MAX) }));
	return {
		runId: head.runId,
		flow: head.spec,
		task: head.task,
		at: head.at,
		// Last attempt per node, as record.ts scores a journal: the bounded retry
		// is the runtime's designed happy path, and a recovered run is not failed.
		status:
			steps.length === 0
				? "running"
				: lastAttempts(steps).some((a) => !a.step.ok)
					? "failed"
					: "done",
		project: "",
		costUsd: steps.reduce((sum, s) => sum + s.costUsd, 0),
		steps,
	};
}

/**
 * The project (and journal) a run belongs to, from the journal it wrote.
 *
 * The join key is the RUN ID, which record.ts now writes into the frontmatter.
 * The flow-name-plus-time-window match is kept only as a fallback for journals
 * written before that field existed: two runs of the same flow started minutes
 * apart in different projects matched each other under it.
 */
export function attachProjects(rows: FlowRunRow[], cfg: FluskConfig): FlowRunRow[] {
	const journals = scanJournals(cfg.ui.harnessDirs).filter((j) => j.kind === "flow");
	return rows.map((row) => {
		const exact = journals.find((j) => j.runId === row.runId);
		const at = Date.parse(row.at);
		const near =
			exact ??
			journals
				.filter((j) => j.tool === row.flow && j.runId === undefined)
				.map((j) => ({ j, gap: Math.abs(Date.parse(j.date) - at) }))
				.filter((m) => Number.isFinite(m.gap) && m.gap <= JOIN_MS)
				.sort((a, b) => a.gap - b.gap)[0]?.j;
		return near === undefined ? row : { ...row, project: near.harness, ref: near.path };
	});
}

export interface FlowRunsOpts {
	project?: string;
	limit?: number;
}

/** Recent runs, newest first. A run without a journal has no project to filter on. */
export async function flowRuns(cfg: FluskConfig, opts: FlowRunsOpts = {}): Promise<FlowRunRow[]> {
	let ids: string[] = [];
	try {
		ids = await readdir(runsRoot());
	} catch {
		return []; // nothing has run yet — that is an answer, not a failure
	}
	const limit = Math.max(0, opts.limit ?? DEFAULT_RUNS);
	const rows: FlowRunRow[] = [];
	// Twice the limit: a project filter drops rows, and a short answer to
	// "show me proj-a's runs" is worse than reading a few more small files.
	const newest = ids.sort((a, b) => b.localeCompare(a)).slice(0, limit * 2);
	for (const id of newest) {
		const row = await flowRun(id);
		if (row !== null) rows.push(row);
	}
	const sorted = attachProjects(rows, cfg).sort((a, b) => b.at.localeCompare(a.at));
	const scoped =
		opts.project === undefined ? sorted : sorted.filter((r) => r.project === opts.project);
	return scoped.slice(0, limit);
}
