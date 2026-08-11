/**
 * Which of a flow's OWN output a step is allowed to read, and how much.
 *
 * `nodes.ts` says which KINDS a step reads; this says how much of them fits and
 * what it costs. The naive move is to hand every step the whole transcript,
 * which fails twice: the tenth step's prompt becomes mostly the first step's
 * thinking, and the budget that should be buying retrieved precedent is spent
 * re-reading this same run. So a step sees the latest artifact of each kind it
 * reads, trimmed to a share of a fixed cap — a hundred-step flow costs the same
 * per step as a three-step one.
 *
 * One deliberate difference from `readsFor`: evidence is taken whether the step
 * PASSED OR FAILED. A code step retrying after a failed gate needs the failure
 * most of all, and dropping it is how a flow repeats itself forever.
 */
import { estimateTokens, trimToSentence } from "../history/budget.js";
import { tokenize } from "../history/tokenize.js";
import { behaviourOf } from "./nodes.js";
import type { FlowNode, FlowState, FlowStep, NodeKind } from "./types.js";

/**
 * A step carries at most a PHRASE. If `about` ever holds a paragraph then
 * someone is hand-writing a prompt and the feature has failed, so the limit is
 * enforced (`phrase`) and machine-checkable (`isPhrase`) rather than asked for.
 */
export const ABOUT_WORDS = 12;
export const ABOUT_CHARS = 80;

/** True when a spec field is a phrase rather than a smuggled-in prompt. */
export function isPhrase(text: string): boolean {
	const one = text.trim();
	return one.length <= ABOUT_CHARS && !one.includes("\n") && one.split(/\s+/).length <= ABOUT_WORDS;
}

/** Clamped to a phrase — a caller who pastes a prompt loses the paragraph. */
export function phrase(about: string): string {
	const words = about.replace(/\s+/g, " ").trim().split(" ").slice(0, ABOUT_WORDS).join(" ");
	return words.length <= ABOUT_CHARS ? words : words.slice(0, ABOUT_CHARS).trimEnd();
}

/** The one line that justifies an inherited artifact's tokens. */
const WHY: Record<NodeKind, string> = {
	plan: "The plan this step implements.",
	code: "What the previous step changed.",
	review: "The most recent review of this work.",
	verify: "The most recent verification evidence.",
	summarize: "The summary this flow already wrote.",
	flow: "What the nested flow returned.",
};

/** Total tokens a step may spend re-reading its own flow. */
export const CONTEXT_TOKENS = 700;

export interface Carried {
	/** Origin, in the shape history cites with: "node plan-1 (plan)". */
	source: string;
	why: string;
	text: string;
	tokens: number;
}

/** Latest step of `kind`, passed or failed; a step never re-reads itself. */
function latest(state: FlowState, kind: NodeKind, self: string): FlowStep | undefined {
	for (let i = state.steps.length - 1; i >= 0; i--) {
		const step = state.steps[i];
		if (step !== undefined && step.kind === kind && step.nodeId !== self) return step;
	}
	return undefined;
}

/** The artifact a step left behind: the state's copy, or what it reported. */
const textOf = (state: FlowState, step: FlowStep): string =>
	(state.artifacts[step.nodeId] ?? step.output).trim();

/** Evidence a caller already holds — the failed gate a retry must react to. */
export type Extra = Pick<Carried, "source" | "why" | "text">;

/**
 * The inherited artifacts, trimmed to fit. Each takes an equal share of what is
 * LEFT, so a 20k-token plan cannot squeeze out the gate evidence saying that
 * plan already failed; what a small artifact does not use rolls forward. Cuts
 * land on sentence or line boundaries — the rule the composer packs by.
 *
 * `extra` is spent from the SAME budget rather than appended afterwards: text
 * bolted on after composition escapes both the cap and the token count that is
 * recorded as the self-improvement signal.
 */
export function nodeContext(
	node: FlowNode,
	state: FlowState,
	budget = CONTEXT_TOKENS,
	extra: Extra[] = [],
): Carried[] {
	const picked: Extra[] = [];
	for (const kind of behaviourOf(node.kind).reads) {
		const step = latest(state, kind, node.id);
		if (step === undefined || textOf(state, step) === "") continue;
		picked.push({
			source: `node ${step.nodeId} (${kind})`,
			why: step.ok ? WHY[kind] : `${WHY[kind]} It did not pass.`,
			text: textOf(state, step),
		});
	}
	picked.push(...extra.filter((e) => e.text.trim() !== ""));
	const out: Carried[] = [];
	let left = budget;
	picked.forEach((from, i) => {
		const share = Math.floor(left / (picked.length - i));
		const text = estimateTokens(from.text) <= share ? from.text : trimToSentence(from.text, share);
		if (text.trim() === "") return;
		left -= estimateTokens(text);
		out.push({ ...from, text, tokens: estimateTokens(text) });
	});
	return out;
}

/**
 * The terms this context contributes to retrieval, most frequent first. This is
 * the wiring nobody has to do by hand: a code step searches history for what
 * its own plan talks about, not merely for the flow's opening sentence.
 */
export function contextTerms(carried: Carried[], limit = 12): string[] {
	const counts = new Map<string, number>();
	for (const c of carried) {
		for (const term of tokenize(c.text)) counts.set(term, (counts.get(term) ?? 0) + 1);
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([term]) => term);
}
