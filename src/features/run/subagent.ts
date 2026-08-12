import type { TaskKind } from "../../platform/config/types.js";
import type { ModelRef, Msg, TextBlock } from "./run.types.js";
import { chooseModel } from "../provider/router.js";
import { loadScores } from "../provider/scores.repository.js";
import type { BudgetTracker } from "../safety/budget.js";
import { type CreateAgentOpts, createAgent } from "./agent.js";

const KINDS: ReadonlySet<string> = new Set(["plan", "code", "review", "summarize"]);

export interface SpawnCtx {
	/** The parent agent's opts; provider/model/tools/policy/config carry over. */
	parent: CreateAgentOpts;
	/** SHARED with the parent so subagent spend counts against one budget. */
	budget: BudgetTracker;
	parentSessionId: string;
	/** Depth of the child being spawned (parent depth + 1). */
	depth: number;
	/** Parent's abort signal; the child agent aborts when the parent does. */
	parentSignal: AbortSignal;
}

/** Routes the child's model by task kind in real runs; the parent's model in
 * fake runs, without a config, without a valid kind, or when routing fails. */
async function pickChildModel(parent: CreateAgentOpts, kind?: string): Promise<ModelRef> {
	if (kind === undefined || !KINDS.has(kind)) return parent.model;
	if (parent.config === undefined || parent.model.provider === "fake") return parent.model;
	try {
		return chooseModel(parent.config, kind as TaskKind, await loadScores()).ref;
	} catch {
		return parent.model; // unresolvable routing entry: keep the parent's model
	}
}

/** Last assistant message's concatenated text blocks, plus its error if any. */
function finalAssistantText(context: Msg[]): { text: string; error?: string } {
	for (let i = context.length - 1; i >= 0; i--) {
		const msg = context[i];
		if (msg?.role === "assistant") {
			const text = msg.content
				.filter((b): b is TextBlock => b.type === "text")
				.map((b) => b.text)
				.join("");
			return msg.errorMessage !== undefined ? { text, error: msg.errorMessage } : { text };
		}
	}
	return { text: "" };
}

/**
 * Runs one subagent to completion and returns its final assistant text.
 * The child gets its OWN EventBus (the parent renderer stays clean) and its
 * own session file linked via parentSession; a non-completed child throws so
 * the dispatcher surfaces an isError result and the parent continues.
 */
export async function runSubagent(ctx: SpawnCtx, task: string, kind?: string): Promise<string> {
	const provider = ctx.parent.subagentProvider?.(task, kind) ?? ctx.parent.provider;
	const agent = createAgent({
		provider,
		model: await pickChildModel(ctx.parent, kind),
		tools: ctx.parent.tools,
		task,
		repoRoot: ctx.parent.repoRoot,
		policy: ctx.parent.policy,
		limits: ctx.parent.limits,
		config: ctx.parent.config,
		summarizeModel: ctx.parent.summarizeModel,
		subagentProvider: ctx.parent.subagentProvider,
		now: ctx.parent.now,
		taskKind: kind,
		parentSession: ctx.parentSessionId,
		depth: ctx.depth,
		budget: ctx.budget,
		parentSignal: ctx.parentSignal,
	});
	try {
		const { reason } = await agent.run();
		const final = finalAssistantText(agent.session.buildContext());
		if (reason !== "completed") {
			throw new Error(final.error ?? (final.text || `subagent run ended: ${reason}`));
		}
		return final.text;
	} finally {
		agent.session.close();
	}
}
