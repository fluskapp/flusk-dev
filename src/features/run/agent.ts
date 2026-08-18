import { randomUUID } from "node:crypto";
import { DEFAULT_CONFIG } from "../../platform/config/defaults.js";
import { createEventBus } from "../../platform/events/events.js";
import { BudgetTracker } from "../safety/budget.js";
import { allowAllPolicy } from "../safety/policy.js";
import { prepareResumeContext } from "../session/repair.js";
import { Session } from "../session/session-file.repository.js";
import { ToolRegistry } from "../tools/registry.js";
import type { ToolContext } from "../tools/tool.js";
import { checkpointMutatingTurns } from "./checkpoints.js";
import { recordContextDecisions, recordRunIds, recordTurnDecisions } from "./decision-recorders.js";
import { wireDelegation } from "./delegation.js";
import { runLoop } from "./loop.js";
import type { Agent, CreateAgentOpts } from "./options.js";
import type { Msg } from "./run.types.js";
import { prepareRun, type RunPrompt } from "./run-context.js";
import { SteeringQueue } from "./steering.js";
import type { Limits } from "./stop.js";

export type { Agent, CreateAgentOpts } from "./options.js";

/** Levels 0 and 1 may spawn subagents; level 2 has no task tool. */
export const MAX_SUBAGENT_DEPTH = 2;

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

	const committed = new Set<number>();
	events.on("run:start", () => committed.clear()); // continueRun restarts turn numbering at 1
	if (opts.isolation !== undefined)
		checkpointMutatingTurns(events, opts.isolation.repoRoot, (t) => committed.add(t));

	const controller = new AbortController();
	// A parent's abort must reach this agent (subagents own their controller).
	if (opts.parentSignal?.aborted === true) controller.abort();
	else opts.parentSignal?.addEventListener("abort", () => controller.abort(), { once: true });
	const steering = new SteeringQueue();
	const toolCtx: ToolContext = {
		repoRoot: opts.repoRoot,
		cwd: opts.repoRoot,
		signal: controller.signal,
		policy,
		events,
		...(opts.commandRoute !== undefined ? { commandRoute: opts.commandRoute } : {}),
	};
	if (depth < MAX_SUBAGENT_DEPTH && policy.decide({ kind: "subagent", depth }).allow) {
		wireDelegation({
			opts,
			budget,
			sessionId: session.id,
			depth: depth + 1,
			signal: controller.signal,
			registry,
			toolCtx,
		});
	}
	// The system prompt and the run-context block are ONE per-run product: built
	// here, frozen into the prompt for every turn (L6), built again on resume.
	// Announced context, loop run ids and per-turn records become explain entries.
	recordContextDecisions(events, session);
	recordRunIds(events, session);
	recordTurnDecisions(events, session, committed);
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
