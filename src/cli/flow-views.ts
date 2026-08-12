/**
 * The two `flusk flow` outputs that never call a model: the library, and the dry
 * plan. Both are pure reads over the on-disk corpus and the flow files, which
 * is why they sit apart from flow-cmd.ts's run path — nothing here can spend
 * money, and that is a property worth being able to see at a glance.
 */
import type { FlowSpec } from "../features/flows/types.js";
import { flowLibrary } from "../features/flows/flow.router.js";
import { type DryOpts, dryPlan } from "../features/flows/flow-plan.js";
import { renderDryPlan, renderFlowList } from "./flow-render.js";

/** `flusk flow list` — built-in and user flows, each as one arrow chain. */
export async function flowListText(repo: string, json: boolean): Promise<string> {
	const lib = await flowLibrary(repo);
	return json ? `${JSON.stringify(lib, null, 2)}\n` : renderFlowList(lib);
}

/** `flusk flow run <task> --dry` — the graph, and every node's composed prompt. */
export async function dryPlanText(
	task: string,
	at: DryOpts & { flows: FlowSpec[] },
	json: boolean,
): Promise<string> {
	const plan = await dryPlan(task, at);
	return json ? `${JSON.stringify(plan, null, 2)}\n` : renderDryPlan(plan);
}
