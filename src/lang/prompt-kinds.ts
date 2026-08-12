/**
 * What a step's KIND contributes to its prompt — the three per-kind tables and
 * nothing else.
 *
 * These are the only generated words in the whole runtime: an imperative verb,
 * a retrieval hint, and a token allowance. Keeping them in one small file is
 * what makes "no prompt is written by hand" checkable — if instruction text
 * ever appears somewhere else, it does not belong there.
 */
import { type Carried, contextTerms, phrase } from "./context.js";
import { aboutOf } from "./nodes.js";
import type { FlowNode, FlowState, NodeKind } from "./types.js";

/**
 * What each kind may spend on retrieved evidence. Planning is where context
 * pays for itself; a verify step reads a change and a report and wants the
 * house rules, not three precedents. Overridable, sensible unattended.
 */
export const BUDGETS: Record<NodeKind, number> = {
	plan: 6000,
	code: 4000,
	review: 2500,
	summarize: 2000,
	verify: 1200,
	flow: 1000,
};

/** The only instruction text this system generates. */
const VERB: Record<NodeKind, string> = {
	plan: "Plan the approach",
	code: "Make the code change",
	review: "Review the change",
	verify: "Verify the change",
	summarize: "Summarize the outcome",
	flow: "Run the nested flow",
};

/** A word of intent, so retrieval leans toward past work of this kind. */
const HINT: Record<NodeKind, string> = {
	plan: "plan design",
	code: "implement",
	review: "review",
	verify: "verify test",
	summarize: "summary",
	flow: "",
};

/** The step's job, as ONE imperative line derived from kind plus about. */
export function jobLine(node: FlowNode): string {
	return `${VERB[node.kind]} for ${phrase(aboutOf(node))} using the evidence below.`;
}

/** Task + phrase + kind + what earlier steps produced. Nobody wires this. */
export function retrievalQuery(node: FlowNode, state: FlowState, carried: Carried[]): string {
	return [state.task, phrase(aboutOf(node)), HINT[node.kind], ...contextTerms(carried)]
		.filter((part) => part.trim() !== "")
		.join(" ");
}
