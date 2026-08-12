/**
 * Running flusk's OWN agent loop as a Worker — the body shared by the
 * "internal" and "http" workers, which differ only in whose model drives the
 * loop.
 *
 * Budget sharing, session linking, depth and abort propagation are already
 * solved in src/agent/subagent.ts; this file calls runSubagent rather than
 * forking a second spawn path, so a delegation still counts against the one
 * BudgetTracker and still dies with its parent. What it adds on top is the
 * Worker contract: the spec's allow-list, observed filesTouched, and a
 * failure returned as a VALUE — runSubagent throws on a non-completed run,
 * and that throw stops here so the orchestrator can keep running siblings.
 */
import type { CreateAgentOpts } from "../agent/agent.js";
import { runSubagent } from "../agent/subagent.js";
import type { ModelRef } from "../core/types.js";
import type { Provider } from "../provider/provider.js";
import type { BudgetTracker } from "../safety/budget.js";
import { snapshotTree, touchedSince } from "./observe.js";
import { delegationPrompt } from "./prompt.js";
import { allowedTools, unknownTools } from "./tools-allow.js";
import type { WorkerResult, WorkerTask } from "./types.js";

/** The parent run a delegation hangs off. Mirrors subagent.ts's SpawnCtx. */
export interface LoopCtx {
	parent: CreateAgentOpts;
	/** SHARED with the parent: a delegation's spend counts against one budget. */
	budget: BudgetTracker;
	parentSessionId: string;
	depth: number;
	parentSignal?: AbortSignal;
}

/** "http" supplies both; "internal" supplies only the routing kind. */
export interface LoopOverride {
	provider?: Provider;
	model?: ModelRef;
	kind?: string;
}

export async function runLoopWorker(
	ctx: LoopCtx,
	task: WorkerTask,
	over: LoopOverride,
): Promise<WorkerResult> {
	const before = snapshotTree(task.cwd);
	const tools = allowedTools(ctx.parent.tools, task.spec.tools);
	const missing = unknownTools(ctx.parent.tools, task.spec.tools);
	const parent: CreateAgentOpts = { ...ctx.parent, repoRoot: task.cwd, tools };
	if (over.provider !== undefined) {
		parent.provider = over.provider;
		// The parent's per-task provider hook would otherwise re-route this
		// delegation back onto the parent's own model, silently ignoring the
		// backend the spec names.
		parent.subagentProvider = undefined;
	}
	if (over.model !== undefined) parent.model = over.model;

	let text = "";
	let error: string | undefined;
	try {
		text = await runSubagent(
			{
				parent,
				budget: ctx.budget,
				parentSessionId: ctx.parentSessionId,
				depth: ctx.depth,
				parentSignal: linkSignals(task.signal, ctx.parentSignal),
			},
			delegationPrompt(task.spec, task.task),
			over.kind,
		);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
	const filesTouched = touchedSince(task.cwd, before);
	const notes =
		missing.length === 0 ? "" : `\n(spec asked for absent tools: ${missing.join(", ")})`;
	if (error !== undefined || task.signal.aborted) {
		const why = error ?? "aborted";
		return {
			ok: false,
			summary: `${task.spec.name} failed: ${why}${notes}`,
			filesTouched,
			error: why,
		};
	}
	const body =
		text.trim() === "" ? `${task.spec.name} finished without a final message` : text.trim();
	return { ok: true, summary: `${body}${notes}`, filesTouched };
}

/** Either signal ends the delegation; neither one detaches from the other. */
function linkSignals(a: AbortSignal, b?: AbortSignal): AbortSignal {
	return b === undefined ? a : AbortSignal.any([a, b]);
}
