/**
 * What `ah flow` prints: the library as one arrow chain per flow, and the dry
 * plan as the graph plus, per node, the single generated instruction line, the
 * sources its context came from, and the prompt itself.
 *
 * That dry block is the feature's evidence: if a user ever has to write a
 * prompt to use this, it would have to appear somewhere in here. Nothing does —
 * every byte below is either a label or something the composer produced.
 */
import type { FlowResult } from "../lang/types.js";
import type { FlowLibrary, FlowView } from "../ui/api-flow.js";
import type { DryPlan } from "../ui/flow-plan.js";

const pad = (text: string, width: number): string =>
	text.length >= width ? text : text + " ".repeat(width - text.length);

function flowLines(flows: FlowView[]): string[] {
	const width = Math.max(4, ...flows.map((f) => f.name.length));
	return flows.map((f) => `  ${pad(f.name, width)}  ${f.shape}`);
}

/** `ah flow list` — built-in and user flows, each as `plan -> code -> verify`. */
export function renderFlowList(lib: FlowLibrary): string {
	const lines = ["built-in flows", ...flowLines(lib.library)];
	lines.push("", "user flows");
	lines.push(
		...(lib.user.length === 0
			? ["  (none) — drop a flow JSON in .ah/flows/ to add one"]
			: flowLines(lib.user)),
	);
	for (const error of lib.errors) lines.push(`  skipped: ${error}`);
	return `${lines.join("\n")}\n`;
}

/**
 * `ah flow run <task> --dry`. The header says where the shape came from, then
 * every node names its job, its sources and its prompt — no model was called to
 * produce any of it.
 */
export function renderDryPlan(plan: DryPlan): string {
	const from = plan.flow === plan.base ? "chosen from the task" : `from ${plan.base}`;
	const lines = [
		`flow: ${plan.flow} (${from})`,
		`graph: ${plan.shape}`,
		`task: ${plan.task}`,
		...(plan.note === "" ? [] : [`note: ${plan.note}`]),
		// The same disclosure `ah prompt` makes: evidence from other projects is
		// still evidence, but a reader has to be told the scope moved.
		...(plan.widened
			? [`scope: ${plan.scope} has no indexed history — searching all projects`]
			: []),
		"",
		`${plan.nodes.length} node(s); every prompt below was composed from history, not written`,
	];
	for (const node of plan.nodes) {
		lines.push(
			"",
			`── ${node.id} (${node.kind}) · ${node.tokens} tokens`,
			`   job: ${node.job}`,
			`   sources: ${node.sources.join(", ")}`,
			"",
			node.text.trimEnd(),
		);
	}
	return `${lines.join("\n")}\n`;
}

/** How a run went: one line per step, then the outcome, the cost and the id. */
export function renderRunSummary(result: FlowResult, shape: string, runId: string): string {
	const lines = [`flow ${result.spec}: ${shape}`];
	for (const step of result.state.steps) {
		const note = step.note === undefined ? "" : ` — ${step.note}`;
		lines.push(`  ${step.ok ? "ok  " : "fail"} ${step.nodeId} (${step.kind})${note}`);
	}
	const cost = result.state.costUsd.toFixed(4);
	const n = result.state.steps.length;
	lines.push(`${result.outcome} · ${n} step(s) · $${cost} · run ${runId}`);
	return `${lines.join("\n")}\n`;
}
