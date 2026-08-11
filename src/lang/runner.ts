/**
 * The run loop: a FlowSpec, executed.
 *
 * Three passes, and the middle one is the point. The entry plan step runs ALONE
 * first, so what it says about follow-up work can grow the graph before the
 * rest of it is compiled — that is what makes a flow's shape dynamic rather
 * than authored. Then the grown flow runs. Then, while the gate says no, the
 * flow goes back to its last code step, bounded by `verify.retries`, carrying
 * the gate's own evidence with it (src/cli/gate-loop.ts steers the same way).
 *
 * Each pass is seeded with the previous pass's state, so artifacts, cost and
 * the step trace accumulate across all of them — LangGraph channels do the
 * merging, this file does not.
 *
 * runFlow never throws: a crash, a missing optional package or a dead model all
 * come back as a FlowResult with outcome "failed" and a note saying why. On the
 * way out the run feeds itself forward — improveFromRun nudges the scores that
 * routed it and promotes what it learned, recordFlowRun writes the journal and
 * the facts — which is the whole reason the next run is better than this one.
 */
import { basename } from "node:path";
import type { AhConfig, ModelChoice, RepoConfig } from "../config/types.js";
import type { Searchable } from "../history/walkthrough.js";
import type { MemoryClient } from "../memory/client-types.js";
import { langMissing, loadLang } from "./deps.js";
import { compile } from "./graph.js";
import { improveFromRun } from "./improve.js";
import { flowResolver } from "./library.js";
import type { ModelBridge } from "./model.js";
import { outcomeOf, stepFrom } from "./nodes.js";
import { growFrom } from "./planner.js";
import { newRunId, recordFlowRun } from "./record.js";
import { fromEntry, reentry } from "./runner-retry.js";
import { makeStepper, type Stepper } from "./step.js";
import type { FlowNode, FlowResult, FlowSpec, FlowState, FlowStep } from "./types.js";

export interface RunFlowOpts {
	repoRoot: string;
	repoConfig?: RepoConfig;
	/** History scope; defaults to the repo's directory name. */
	project?: string;
	client?: MemoryClient | null;
	/** A corpus built once for the whole run; defaults to the saved index. */
	index?: Searchable;
	/** Flows a nested "flow" node may name; defaults to the built-ins. */
	flows?: FlowSpec[];
	/** Gate retries; defaults to cfg.verify.retries. */
	retries?: number;
	maxNodes?: number;
	runId?: string;
	/** Continue a crashed run of the same id: completed nodes replay. */
	resume?: boolean;
	/** Test seam: the chat model for an already-routed choice. */
	chat?: (choice: ModelChoice, node: FlowNode) => Promise<ModelBridge>;
	/** What a step cost. LangChain reports no price, so ah supplies one. */
	costOf?: (node: FlowNode, output: string) => number;
	now?: () => number;
}

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Compiles, executes and reports how the run ended. Never throws. */
export async function runFlow(
	spec: FlowSpec,
	task: string,
	cfg: AhConfig,
	opts: RunFlowOpts,
): Promise<FlowResult> {
	const project = opts.project ?? basename(opts.repoRoot);
	const runId = opts.runId ?? newRunId(spec.name);
	let stepper: Stepper | null = null;
	let result: FlowResult;
	try {
		const deps = await loadLang();
		if (deps === null) throw new Error(`the flow runtime needs LangGraph — ${langMissing()}`);
		const step = await makeStepper(cfg, opts, { task, project, runId, spec: spec.name });
		stepper = step;
		const ctx = { runNode: step.runNode, resolveFlow: flowResolver(opts.flows) };
		const run = (s: FlowSpec, seed: FlowState): Promise<FlowState> =>
			compile(s, deps, ctx).invoke(seed);
		let state: FlowState = { task, project, artifacts: {}, costUsd: 0, steps: [] };
		let plan = { spec, base: spec.name, entry: spec.entry, note: "" };
		const head = spec.nodes.find((n) => n.id === spec.entry);

		// The plan step alone, so its output can add nodes before the rest compiles.
		if (head?.kind === "plan" && head.next?.length === 1) {
			state = await run({ ...spec, nodes: [{ ...head, next: [] }] }, state);
			plan = growFrom(plan, head.id, state.artifacts[head.id] ?? "", opts.maxNodes);
			const noted = (s: FlowStep): FlowStep =>
				s.nodeId === head.id ? { ...s, note: plan.note } : s;
			if (plan.note !== "") state = { ...state, steps: state.steps.map(noted) };
		}
		state = await run(fromEntry(plan.spec, plan.entry), state);

		// A failed gate sends the flow back, with the evidence, bounded by retries.
		for (let n = 0; n < (opts.retries ?? cfg.verify.retries); n++) {
			const back = reentry(plan.spec, state);
			if (back === undefined || step.stopped() !== "") break;
			state = await run(fromEntry(plan.spec, back), state);
		}
		const capped = step.stopped();
		const outcome = capped !== "" ? "blocked" : outcomeOf(state);
		result = { spec: spec.name, state, ok: outcome === "completed", outcome };
	} catch (e) {
		const failed = { ok: false, output: "", promptTokens: 0, note: why(e) };
		// An id of its OWN: reusing the entry's overwrites a step that succeeded,
		// and the journal would then report that step as the one that failed.
		const crash = stepFrom(
			{ id: `${spec.name}:crash`, kind: "flow" },
			new Date().toISOString(),
			failed,
		);
		const steps = [...(stepper?.steps ?? []), crash];
		// The trace holds every output the run produced; `{}` threw them away.
		const done = steps.filter((s) => s.ok).map((s) => [s.nodeId, s.output] as const);
		const state = {
			task,
			project,
			artifacts: Object.fromEntries(done),
			costUsd: stepper?.spent() ?? 0,
			steps,
		};
		result = { spec: spec.name, state, ok: false, outcome: "failed" };
	}
	try {
		const resumed = opts.resume === true;
		const at = { repoRoot: opts.repoRoot, client: opts.client, runId };
		await improveFromRun(result, { ...at, models: stepper?.models ?? {}, resumed });
		await recordFlowRun(result, at);
	} catch {
		// Learning from a run is never worth failing the run that produced it.
	}
	return result;
}
