/**
 * One node, run — the `runNode` seam every flow graph calls into.
 *
 * The same five things happen to every node and none of them is written by a
 * user: `nodePrompt` composes the prompt out of history, ah's learned scores
 * pick the model, the call is made, the outcome is checkpointed, and the cost
 * is charged against the run's budget. A verify node additionally runs the REAL
 * gate (gate.ts), because a flow that grades its own homework is worth nothing.
 *
 * Every call is PRICED (price.ts) from the reply's own usage, or from the
 * composer's estimate when the backend reports none. `costOf` stays as a test
 * seam, but nothing depends on a caller supplying it: a cap nobody meters is
 * not a cap, and `--max-cost` is supposed to be one.
 *
 * Caps behave as the agent loop's do: the first breach stops the run, and every
 * later node reports the same reason instead of spending more. A resume picks
 * the tally up where the crash left it rather than starting again at zero.
 */
import type { AhConfig, ModelChoice } from "../config/types.js";
import { buildIndex } from "../history/bm25.js";
import { historyCards } from "../history/corpus.js";
import { chooseModel } from "../provider/router.js";
import { loadScores } from "../provider/scores.js";
import { BudgetTracker } from "../safety/budget.js";
import { openCheckpoint } from "./checkpoint.js";
import type { Extra } from "./context.js";
import { gate } from "./gate.js";
import { chatModelFor, textOf } from "./model.js";
import { stepFrom, taskKindOf } from "./nodes.js";
import { costOf, usageOf } from "./price.js";
import { nodePrompt } from "./prompt-provider.js";
import type { RunFlowOpts } from "./runner.js";
import type { FlowNode, FlowState, FlowStep, NodeOutcome, RunNode } from "./types.js";

export interface Stepper {
	runNode: RunNode;
	/** Every step taken so far, so a crash still has a trace. */
	steps: FlowStep[];
	/** "provider/id" per node id — what improveFromRun nudges. */
	models: Record<string, string>;
	/** Non-empty once a budget or deadline cap stopped the run. */
	stopped: () => string;
	/** What the run has spent, so even a crash reports its cost. */
	spent: () => number;
}

export interface StepAt {
	task: string;
	project: string;
	runId: string;
	spec: string;
}

export async function makeStepper(cfg: AhConfig, opts: RunFlowOpts, at: StepAt): Promise<Stepper> {
	const scores = await loadScores();
	const index = opts.index ?? buildIndex(historyCards());
	const cp = await openCheckpoint({ ...at, resume: opts.resume });
	const minutes = cfg.budgets.deadlineMinutes;
	const clock = opts.now ?? Date.now;
	const budget = new BudgetTracker(
		{ maxCostUsd: cfg.budgets.maxCostUsd, deadlineMs: minutes === null ? null : minutes * 60_000 },
		clock(),
	);
	// A resume is the SAME run continuing, so it inherits what that run already
	// spent; a fresh tracker would make every cap per-attempt instead of per-run.
	if (cp.spent > 0) budget.record({ input: 0, output: 0, cacheRead: 0, costUsd: cp.spent });
	const steps: FlowStep[] = [];
	const models: Record<string, string> = {};
	let stopped = "";
	/** The last failed gate's own words, carried to the step that must react. */
	let evidence = "";

	const route = (node: FlowNode): ModelChoice => {
		const [provider, id] = (node.model ?? "").split("/");
		if (provider !== undefined && id !== undefined && id !== "") return { provider, id };
		const kind = taskKindOf(node) ?? "code";
		try {
			return chooseModel(cfg, kind, scores).choice;
		} catch {
			return cfg.models[kind]; // an unresolvable learned winner still routes
		}
	};

	const attempt = async (node: FlowNode, state: FlowState): Promise<NodeOutcome> => {
		const halt = stopped === "" ? budget.breach(clock()) : null;
		if (halt !== null) stopped = `stopped: ${halt} cap reached`;
		if (stopped !== "") return { ok: false, output: "", promptTokens: 0, note: stopped };
		const replay = cp.done.get(node.id);
		if (replay !== undefined) {
			cp.done.delete(node.id); // replay a node once; a second visit is a real retry
			return { ...replay, costUsd: 0, note: "replayed from checkpoint" };
		}
		const choice = route(node);
		models[node.id] = `${choice.provider}/${choice.id}`;
		const bridge = opts.chat
			? await opts.chat(choice, node)
			: await chatModelFor(choice, { backend: cfg.chat.backends[0] });
		if (bridge.model === null) throw new Error(`node "${node.id}": ${bridge.reason}`);
		// The failed gate rides in as CONTEXT, not as text appended afterwards:
		// that way it is trimmed to the same cap and counted in promptTokens.
		const carry: Extra[] =
			evidence === "" || node.kind !== "code"
				? []
				: [
						{
							source: "gate evidence",
							why: "The gate this step must satisfy; it did not pass.",
							text: evidence,
						},
					];
		const prompt = nodePrompt(node, state, { index, project: at.project, carry });
		const reply = await bridge.model.invoke(prompt.text);
		const output = textOf(reply.content);
		const cost = opts.costOf?.(node, output) ?? costOf(choice, usageOf(reply, prompt.text, output));
		budget.record({ input: 0, output: 0, cacheRead: 0, costUsd: cost });
		const base: NodeOutcome = { ok: true, output, promptTokens: prompt.tokens, costUsd: cost };
		if (node.kind !== "verify") return base;
		const gated = gate(output, base, cfg, { repoRoot: opts.repoRoot, repoConfig: opts.repoConfig });
		evidence = gated.ok ? "" : gated.output;
		return gated;
	};

	const runNode: RunNode = async (node, state) => {
		const startedAt = new Date().toISOString();
		const outcome = await attempt(node, state);
		steps.push(stepFrom(node, startedAt, outcome));
		await cp.save(node, outcome);
		return outcome;
	};

	return { runNode, steps, models, stopped: () => stopped, spent: () => budget.spentUsd() };
}
