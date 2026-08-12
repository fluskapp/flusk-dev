/**
 * The built-in step kinds, as data.
 *
 * Each kind is described once — what it reads out of the state, how flusk should
 * route and score it, the phrase it means when a spec leaves `about` off — so
 * the runtime never branches on a kind string, and adding a kind is an entry
 * in this table rather than five new `if`s.
 *
 * `reads` is expressed in KINDS, not node ids: a spec should be able to rename
 * its nodes without teaching every later step the new names.
 *
 * What a node INHERITS is not here — `nodeContext` in context.ts is the single
 * answer to that, budget and failed-step handling included.
 */
import type { TaskKind } from "../../platform/config/types.js";
import type {
	FlowNode,
	FlowState,
	FlowStep,
	NodeBehaviour,
	NodeKind,
	NodeOutcome,
} from "./types.js";

export const BEHAVIOURS: Record<NodeKind, NodeBehaviour> = {
	plan: {
		kind: "plan",
		reads: [],
		taskKind: "plan",
		about: "sketch the approach",
		blocking: false,
	},
	code: {
		kind: "code",
		reads: ["plan", "review"],
		taskKind: "code",
		about: "make the change",
		blocking: true,
	},
	review: {
		kind: "review",
		reads: ["code", "plan"],
		taskKind: "review",
		about: "find what is wrong with the change",
		blocking: false,
	},
	// Judging evidence is a reviewer's job, so verification routes and scores
	// as review — TaskKind has no "verify" and inventing one would fork routing.
	verify: {
		kind: "verify",
		reads: ["code"],
		taskKind: "review",
		about: "prove the change works",
		blocking: true,
	},
	summarize: {
		kind: "summarize",
		reads: ["plan", "code", "review", "verify"],
		taskKind: "summarize",
		about: "say what happened",
		blocking: false,
	},
	flow: { kind: "flow", reads: [], taskKind: null, about: "run a nested flow", blocking: true },
};

export function behaviourOf(kind: NodeKind): NodeBehaviour {
	return BEHAVIOURS[kind];
}

/** The step's job in a phrase. Never a prompt — the composer writes those. */
export function aboutOf(node: FlowNode): string {
	const said = node.about?.trim() ?? "";
	return said === "" ? behaviourOf(node.kind).about : said;
}

/** How this step is routed and scored, or null when it runs no model. */
export function taskKindOf(node: FlowNode): TaskKind | null {
	return behaviourOf(node.kind).taskKind;
}

/**
 * One entry per node id, carrying that node's LAST attempt and how many there
 * were. The bounded retry is the runtime's designed happy path, so a verdict
 * read off the whole trace calls a recovered run failed; only the final attempt
 * of each node says how that node ended.
 */
export function lastAttempts<T extends { nodeId: string }>(
	steps: T[],
): { step: T; tries: number }[] {
	const byId = new Map<string, { step: T; tries: number }>();
	for (const step of steps) {
		byId.set(step.nodeId, { step, tries: (byId.get(step.nodeId)?.tries ?? 0) + 1 });
	}
	return [...byId.values()];
}

/** Blocked only when a node's FINAL attempt failed on a blocking kind. */
export function isBlocked(steps: FlowStep[]): boolean {
	return lastAttempts(steps).some(({ step }) => !step.ok && behaviourOf(step.kind).blocking);
}

/** THE verdict for a finished trace — one definition of what "blocked" means. */
export function outcomeOf(state: Pick<FlowState, "steps">): "completed" | "blocked" {
	return isBlocked(state.steps) ? "blocked" : "completed";
}

/** One row of the trace. The runtime owns the clock so a runNode never has to. */
export function stepFrom(
	node: Pick<FlowNode, "id" | "kind">,
	startedAt: string,
	o: NodeOutcome,
): FlowStep {
	return {
		nodeId: node.id,
		kind: node.kind,
		startedAt,
		endedAt: new Date().toISOString(),
		ok: o.ok,
		output: o.output,
		promptTokens: o.promptTokens,
		...(o.note === undefined ? {} : { note: o.note }),
	};
}

/** What a finished step writes back: its artifact, its cost, its trace. */
export function updateFrom(
	node: FlowNode,
	step: FlowStep,
	outcome: NodeOutcome,
): Partial<FlowState> {
	return {
		artifacts: { [node.id]: outcome.output },
		costUsd: outcome.costUsd ?? 0,
		steps: [step],
	};
}
