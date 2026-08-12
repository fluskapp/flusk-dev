/**
 * What shape this run should be — decided from the task, at run time.
 *
 * Two moves. First a library flow is picked by INTENT, reusing
 * src/provider/intent.ts rather than growing a second classifier. Then the plan
 * step itself grows the graph: whatever it says about follow-up steps is parsed
 * and appended before execution continues, so the shape comes from the work
 * rather than from this file. Reading those declarations out of model text is
 * planner-parse.ts; splicing them into the graph without orphaning the rest of
 * it is here.
 */
import type { TaskKind } from "../config/types.js";
import { classifyTask } from "../provider/intent.js";
import { BUILT_IN, FIX, flowByName } from "./library.js";
import { followUps } from "./planner-parse.js";
import type { FlowSpec } from "./types.js";

/** Nodes one run may hold, additions included. A plan that wants more is wrong. */
export const MAX_NODES = 12;

const BY_INTENT: Record<TaskKind, string> = {
	code: "fix",
	review: "review",
	plan: "explore",
	summarize: "explore",
};

export interface PlanCfg {
	/** The flows to choose from; defaults to the built-ins. */
	flows?: FlowSpec[];
	/** Name a flow outright (`flusk flow ship …`); intent decides when absent. */
	flow?: string;
	maxNodes?: number;
}

export interface FlowPlan {
	spec: FlowSpec;
	/** The library flow this started from. */
	base: string;
	/** Where the run continues — the first added node after a growth pass. */
	entry: string;
	/** Empty when there is nothing to say; otherwise what was added or trimmed. */
	note: string;
}

/** The starting shape for a task: a named flow, else intent, else "fix". */
export function planFlow(task: string, cfg: PlanCfg = {}): FlowPlan {
	const flows = cfg.flows ?? BUILT_IN;
	const named = cfg.flow === undefined ? null : flowByName(cfg.flow, flows);
	const spec = named ?? flowByName(BY_INTENT[classifyTask(task)], flows) ?? flows[0] ?? FIX;
	const max = cfg.maxNodes ?? MAX_NODES;
	const over = spec.nodes.length > max;
	return {
		spec,
		base: spec.name,
		entry: spec.entry,
		note: over
			? `flow "${spec.name}" already has ${spec.nodes.length} nodes, past the ${max}-node cap`
			: "",
	};
}

function unique(id: string, taken: Set<string>): string {
	if (!taken.has(id)) return id;
	for (let n = 2; ; n++) if (!taken.has(`${id}-${n}`)) return `${id}-${n}`;
}

/**
 * The plan's follow-ups, spliced in after `headId` and ahead of whatever it
 * already pointed at, so a growth never orphans the rest of the flow.
 */
export function growFrom(plan: FlowPlan, headId: string, text: string, max = MAX_NODES): FlowPlan {
	const head = plan.spec.nodes.find((n) => n.id === headId);
	const rest = head?.next ?? [];
	const after = { ...plan, entry: rest[0] ?? headId, note: "" };
	const added = followUps(text);
	if (head === undefined || added.length === 0) return after;
	const kept = added.slice(0, Math.max(0, max - plan.spec.nodes.length));
	const cut = added.length - kept.length;
	const trimmed = cut === 0 ? "" : `; the ${max}-node cap trimmed ${cut}`;
	const note = `the plan added ${kept.length} step(s)${trimmed}`;
	if (kept.length === 0) return { ...after, note };
	const taken = new Set(plan.spec.nodes.map((n) => n.id));
	const chain = kept.map((n) => {
		const id = unique(n.id, taken);
		taken.add(id);
		return { ...n, id };
	});
	const first = chain[0]?.id ?? after.entry;
	const nodes = plan.spec.nodes.map((n) => (n.id === headId ? { ...n, next: [first] } : n));
	for (const [i, n] of chain.entries()) {
		const onward = chain[i + 1];
		nodes.push({ ...n, next: onward === undefined ? rest : [onward.id] });
	}
	return { spec: { ...plan.spec, nodes }, base: plan.base, entry: first, note };
}
