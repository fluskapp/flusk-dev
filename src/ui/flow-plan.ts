/**
 * A flow's shape, and the prompts it WOULD run on — without running it.
 *
 * This is what `ah flow run --dry` and POST /api/flow/dry both answer with, and
 * it is the proof of the feature's headline claim: every node's prompt is
 * composed here out of history (src/history/compose.ts, through nodePrompt), so
 * the only string a user ever writes is the task itself.
 *
 * Nothing in this file calls a model, and nothing in it can: the composer is
 * pure retrieval over the on-disk corpus.
 */
import { basename } from "node:path";
import { buildIndex } from "../history/bm25.js";
import { historyCards } from "../history/corpus.js";
import type { Searchable } from "../history/walkthrough.js";
import { loadFlows } from "../lang/flow-files.js";
import { flowResolver } from "../lang/library.js";
import { aboutOf } from "../lang/nodes.js";
import { planFlow } from "../lang/planner.js";
import { jobLine } from "../lang/prompt-kinds.js";
import { nodePrompt } from "../lang/prompt-provider.js";
import type { FlowSpec, FlowState, NodeKind } from "../lang/types.js";
import { expand, shapeOf } from "./flow-shape.js";

/** The corpus is on disk and the BM25 build is not free; one per window. */
const STALE_MS = 30_000;
let cached: { at: number; index: Searchable } | null = null;

export function flowIndex(): Searchable {
	const now = Date.now();
	if (cached !== null && now - cached.at < STALE_MS) return cached.index;
	cached = { at: now, index: buildIndex(historyCards()) };
	return cached.index;
}

export interface DryNode {
	id: string;
	kind: NodeKind;
	/** The phrase naming the job — never a prompt. */
	about: string;
	/** The ONE instruction line this system generates for the step. */
	job: string;
	tokens: number;
	/** Where every section of the prompt came from, in order. */
	sources: string[];
	/** The prompt itself: exactly what the model would be sent. */
	text: string;
	/** True when this step's evidence came from outside the flow's project. */
	widened: boolean;
}

export interface DryPlan {
	task: string;
	flow: string;
	/** The library flow the shape started from. */
	base: string;
	note: string;
	shape: string;
	/** The history scope the prompts were built from. */
	scope: string;
	/** True when that scope knew nothing and every project was searched. */
	widened: boolean;
	nodes: DryNode[];
}

export interface DryOpts {
	repoRoot: string;
	/** Name a flow outright; absent means the task decides (planFlow). */
	flow?: string;
	project?: string;
	flows?: FlowSpec[];
	index?: Searchable;
}

/** The graph this task would run, and the composed prompt for every step. */
export async function dryPlan(task: string, opts: DryOpts): Promise<DryPlan> {
	const flows = opts.flows ?? (await loadFlows(opts.repoRoot)).flows;
	const resolve = flowResolver(flows);
	const plan = planFlow(task, { flows, ...(opts.flow === undefined ? {} : { flow: opts.flow }) });
	const project = opts.project ?? basename(opts.repoRoot);
	const index = opts.index ?? flowIndex();
	const state: FlowState = { task, project, artifacts: {}, costUsd: 0, steps: [] };
	const nodes = expand(plan.spec, resolve).map(({ id, node }) => {
		const prompt = nodePrompt(node, state, { index, project });
		return {
			id,
			kind: node.kind,
			about: aboutOf(node),
			job: jobLine(node),
			tokens: prompt.tokens,
			sources: prompt.sources,
			text: prompt.text,
			widened: prompt.widened,
		};
	});
	return {
		task,
		flow: plan.spec.name,
		base: plan.base,
		note: plan.note,
		shape: shapeOf(plan.spec, resolve),
		scope: project,
		// Disclosed, never silent: a dry run in an unindexed checkout otherwise
		// shows another project's precedent with nothing saying so.
		widened: nodes.some((n) => n.widened),
		nodes,
	};
}
