import { randomUUID } from "node:crypto";
import { DEFAULT_CONFIG } from "../config/defaults.js";
import { createEventBus } from "../core/events.js";
import { runLoop } from "../core/loop.js";
import { SteeringQueue } from "../core/steering.js";
import type { Limits } from "../core/stop.js";
import type { Msg } from "../core/types.js";
import { BudgetTracker } from "../safety/budget.js";
import { allowAllPolicy } from "../safety/policy.js";
import { prepareResumeContext } from "../session/repair.js";
import { Session } from "../session/session.js";
import { ToolRegistry } from "../tools/registry.js";
import { taskTool } from "../tools/task.js";
import type { ToolContext } from "../tools/tool.js";
import { checkpointMutatingTurns } from "./checkpoints.js";
import type { Agent, CreateAgentOpts } from "./options.js";
import { prepareRun, type RunPrompt } from "./run-context.js";
import { runSubagent } from "./subagent.js";

export type { Agent, CreateAgentOpts } from "./options.js";

/** Levels 0 and 1 may spawn subagents; level 2 has no task tool. */
const MAX_SUBAGENT_DEPTH = 2;

export function createAgent(opts: CreateAgentOpts): Agent {
	const policy = opts.policy ?? allowAllPolicy;
	const events = opts.events ?? createEventBus();
	const config = opts.config ?? DEFAULT_CONFIG;
	const now = opts.now ?? Date.now;
	const depth = opts.depth ?? 0;
	const limits: Limits = { maxTurns: opts.limits?.maxTurns ?? config.budgets.maxTurns };
	if (opts.limits?.deadlineMs !== undefined) limits.deadlineMs = opts.limits.deadlineMs;
	const deadlineMs =
		config.budgets.deadlineMinutes === null ? null : config.budgets.deadlineMinutes * 60_000;
	const budget =
		opts.budget ?? new BudgetTracker({ maxCostUsd: config.budgets.maxCostUsd, deadlineMs }, now());

	const registry = new ToolRegistry();
	for (const tool of opts.tools) registry.register(tool);

	const isResume = opts.sessionPath !== undefined;
	const session =
		opts.sessionPath !== undefined
			? Session.load(opts.sessionPath)
			: Session.create({
					task: opts.task,
					repoRoot: opts.repoRoot,
					model: opts.model,
					taskKind: opts.taskKind,
					parentSession: opts.parentSession,
				});
	let initialContext: Msg[];
	if (isResume) {
		initialContext = prepareResumeContext(session, opts.steer);
	} else {
		initialContext = session.buildContext();
		const taskMsg: Msg = { role: "user", content: opts.task };
		session.appendMessage(taskMsg);
		initialContext.push(taskMsg);
	}

	if (opts.isolation !== undefined) checkpointMutatingTurns(events, opts.isolation.repoRoot);

	const controller = new AbortController();
	// A parent's abort must reach this agent (subagents run on their own controller).
	if (opts.parentSignal?.aborted === true) controller.abort();
	else opts.parentSignal?.addEventListener("abort", () => controller.abort(), { once: true });
	const steering = new SteeringQueue();
	const toolCtx: ToolContext = {
		repoRoot: opts.repoRoot,
		cwd: opts.repoRoot,
		signal: controller.signal,
		policy,
		events,
	};
	if (depth < MAX_SUBAGENT_DEPTH && policy.decide({ kind: "subagent", depth }).allow) {
		const spawnCtx = {
			parent: opts,
			budget,
			parentSessionId: session.id,
			depth: depth + 1,
			parentSignal: controller.signal,
		};
		toolCtx.spawnSubagent = (task: string, kind?: string) => runSubagent(spawnCtx, task, kind);
		registry.register(taskTool);
	}
	/**
	 * The system prompt and the run-context block are ONE per-run product: the
	 * block is built here and frozen into the prompt for every turn of that run
	 * (L6), and the prompt drops whatever the block already quotes. Built again
	 * on resume, when the tree and the run's own journal have moved.
	 */
	const prepare = (resume: boolean): RunPrompt =>
		prepareRun({
			repoRoot: opts.repoRoot,
			task: opts.task,
			model: opts.model,
			isResume: resume,
			events,
			context: config.context,
			sessionRef: session.path,
			...(opts.contextSources !== undefined ? { sources: opts.contextSources } : {}),
		});

	const deps = {
		provider: opts.provider,
		model: opts.model,
		registry,
		session,
		events,
		steering,
		toolCtx,
		signal: controller.signal,
		runId: opts.runId ?? randomUUID().slice(0, 8),
		repoPath: opts.repoRoot,
		task: opts.task,
		goalId: opts.goalId,
		isResume,
		limits,
		initialContext,
		budget,
		now,
		compaction: {
			summarizeModel: opts.summarizeModel ?? opts.model,
			reserveTokens: config.compaction.reserveTokens,
			keepRecentTokens: config.compaction.keepRecentTokens,
		},
	};
	return {
		run: () => runLoop({ ...deps, ...prepare(isResume) }),
		// Continuation = resume-in-place: same session, fresh run id, steer
		// appended — and a fresh context build, because it is a new run.
		continueRun: (steer: string) =>
			runLoop({
				...deps,
				...prepare(true),
				runId: randomUUID().slice(0, 8),
				isResume: true,
				initialContext: prepareResumeContext(session, steer),
			}),
		steer: (text: string) => steering.push(text),
		abort: () => controller.abort(),
		events,
		session,
	};
}
