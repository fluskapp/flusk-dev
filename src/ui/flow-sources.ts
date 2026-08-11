/**
 * Where a finished run's prompts came from.
 *
 * The checkpoint keeps every step's OUTPUT but not the prompt that produced it,
 * so a single run's detail RECOMPOSES each prompt the way the run did — same
 * node, same index, same accumulating state — rather than guessing. Nothing is
 * sent anywhere; this is pure retrieval, as flow-plan.ts's dry plan is.
 */
import { loadFlows } from "../lang/flow-files.js";
import { flowByName } from "../lang/library.js";
import { nodePrompt } from "../lang/prompt-provider.js";
import type { FlowState, FlowStep } from "../lang/types.js";
import { flowIndex } from "./flow-plan.js";
import type { FlowRunRow } from "./flow-runs.js";

/** The same run, with each step's prompt sources recomposed as the run had them. */
export async function withSources(row: FlowRunRow, repoRoot: string): Promise<FlowRunRow> {
	const spec = flowByName(row.flow, (await loadFlows(repoRoot)).flows);
	const index = flowIndex();
	const project = row.project;
	const state: FlowState = { task: row.task, project, artifacts: {}, costUsd: 0, steps: [] };
	const steps = row.steps.map((step) => {
		const known = spec?.nodes.find((n) => n.id === step.nodeId);
		const node = known ?? { id: step.nodeId, kind: step.kind };
		const composed = nodePrompt(node, state, { index, project });
		state.artifacts[step.nodeId] = step.output;
		const trace: FlowStep = {
			nodeId: step.nodeId,
			kind: step.kind,
			startedAt: step.at,
			ok: step.ok,
			output: step.output,
			promptTokens: step.promptTokens,
		};
		state.steps.push(trace);
		return { ...step, sources: composed.sources, widened: composed.widened };
	});
	return { ...row, steps };
}
