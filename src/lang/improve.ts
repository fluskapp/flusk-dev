/**
 * What the next flow run inherits from this one. Three feedback paths, each
 * into machinery that already exists rather than a parallel one:
 *
 * - routing: every step that ran a model nudges src/provider/scores.ts for its
 *   task kind, so the router's next pick is informed by this run;
 * - lessons: a step that failed and whose retry succeeded is the one thing a
 *   run can honestly teach. What changed is written as an ErrorClass/Approach
 *   fact and handed to the EXISTING promotion rules — verified runs only, so
 *   an unverified guess never becomes cross-repo advice (review-findings.md);
 * - shape: the per-flow tally in flow-stats.ts.
 *
 * Improving is never worth failing a run that already happened: every step is
 * best-effort, and a step that fails costs exactly one note.
 */
import type { FactStore } from "../store/types.js";
import { resolveNamespace } from "../store/namespaces.js";
import { nudge } from "../provider/scores.js";
import { repoSlug } from "../session/paths.js";
import { bumpFlowStats, type FlowStat } from "./flow-stats.js";
import { writeLessons } from "./lessons.js";
import { taskKindOf } from "./nodes.js";
import { errText, flowRunId, startedAtOf } from "./record.js";
import type { FlowResult, FlowStep } from "./types.js";

export interface ImproveCfg {
	repoRoot: string;
	store?: FactStore | null;
	/** Defaults to the repo namespace (src/store/namespaces.ts). */
	ns?: string;
	/** Defaults to the id recordFlowRun uses, so both halves agree. */
	runId?: string;
	/** "provider/id" per node id — the routing decision the runner made. */
	models?: Record<string, string>;
	/** Model for steps the map does not name. */
	model?: string;
	/** A resumed run is the SAME run: it must not be tallied a second time. */
	resumed?: boolean;
}

export interface ImproveReport {
	/** "kind/model+" or "kind/model-", one per nudged step. */
	nudged: string[];
	lessons: number;
	stat?: FlowStat;
	notes: string[];
}

/**
 * What a step is SCORED on, which is not always whether the step said `ok`.
 *
 * A non-verify step reports `ok` for emitting text at all, so scoring it on
 * that rewards a model for saying anything. The honest signal for a change is
 * the gate that judged it, so a `code` step takes the verdict of the verify
 * step that followed it. A verify step is scored on whether it produced a
 * usable report — never on whether the gate passed, which is the state of the
 * repository, not the quality of the reviewer.
 */
export function creditFor(steps: FlowStep[], i: number): boolean {
	const step = steps[i];
	if (step === undefined) return false;
	if (step.kind === "verify") return step.output.trim() !== "";
	if (step.kind !== "code") return step.ok;
	const gate = steps.slice(i + 1).find((s) => s.kind === "verify");
	return gate === undefined ? step.ok : gate.ok;
}

async function nudgeSteps(r: FlowResult, cfg: ImproveCfg): Promise<string[]> {
	const out: string[] = [];
	for (const [i, s] of r.state.steps.entries()) {
		const kind = taskKindOf({ id: s.nodeId, kind: s.kind });
		const model = cfg.models?.[s.nodeId] ?? cfg.model;
		if (kind === null || model === undefined) continue;
		const good = creditFor(r.state.steps, i);
		// Sequential: nudge is a read-modify-write of one benchmarks file.
		await nudge(kind, model, good);
		out.push(`${kind}/${model}${good ? "+" : "-"}`);
	}
	return out;
}

async function attempt<T>(what: string, notes: string[], fn: () => Promise<T>): Promise<T | null> {
	try {
		return await fn();
	} catch (err) {
		notes.push(`${what} not updated: ${errText(err)}`);
		return null;
	}
}

export async function improveFromRun(r: FlowResult, cfg: ImproveCfg): Promise<ImproveReport> {
	const notes: string[] = [];
	const report: ImproveReport = { nudged: [], lessons: 0, notes };
	report.nudged = (await attempt("model scores", notes, () => nudgeSteps(r, cfg))) ?? [];
	const store = cfg.store;
	if (store) {
		const ns = cfg.ns ?? resolveNamespace(cfg.repoRoot);
		const at = { slug: repoSlug(cfg.repoRoot), runId: cfg.runId ?? flowRunId(r) };
		const write = (): Promise<number> => writeLessons(r, store, ns, at);
		report.lessons = (await attempt("lessons", notes, write)) ?? 0;
	}
	// A resume already has a tally: counting it again reports two attempts and
	// one completion for a flow that ran once.
	if (cfg.resumed === true) return report;
	const stat = await attempt("flow stats", notes, () => bumpFlowStats(r, startedAtOf(r)));
	if (stat) report.stat = stat;
	return report;
}
