import { randomUUID } from "node:crypto";
import { createEventBus, type EventBus } from "../core/events.js";
import { runLoop } from "../core/loop.js";
import { SteeringQueue } from "../core/steering.js";
import type { Limits } from "../core/stop.js";
import type { ModelRef, Msg, RunEndReason, RunStats } from "../core/types.js";
import { type MemoryPort, noopMemory } from "../memory/port.js";
import type { Provider } from "../provider/provider.js";
import { allowAllPolicy, type Policy } from "../safety/policy.js";
import { Session } from "../session/session.js";
import { ToolRegistry } from "../tools/registry.js";
import type { Tool, ToolContext } from "../tools/tool.js";
import { buildSystemPrompt } from "./system-prompt.js";

export interface CreateAgentOpts {
	provider: Provider;
	model: ModelRef;
	tools: Tool[];
	task: string;
	repoRoot: string;
	memory?: MemoryPort;
	policy?: Policy;
	events?: EventBus;
	limits?: Partial<Limits>;
	/** Resume an existing session file instead of creating a new one. */
	sessionPath?: string;
}

export interface Agent {
	run(): Promise<{ reason: RunEndReason; stats: RunStats }>;
	steer(text: string): void;
	abort(): void;
	events: EventBus;
	session: Session;
}

export function createAgent(opts: CreateAgentOpts): Agent {
	const memory = opts.memory ?? noopMemory;
	const policy = opts.policy ?? allowAllPolicy;
	const events = opts.events ?? createEventBus();
	const limits: Limits = { maxTurns: opts.limits?.maxTurns ?? 100 };
	if (opts.limits?.deadlineMs !== undefined) limits.deadlineMs = opts.limits.deadlineMs;

	const registry = new ToolRegistry();
	for (const tool of [...opts.tools, ...memory.tools()]) {
		registry.register(tool);
	}

	const isResume = opts.sessionPath !== undefined;
	const session =
		opts.sessionPath !== undefined
			? Session.load(opts.sessionPath)
			: Session.create({ task: opts.task, repoRoot: opts.repoRoot, model: opts.model });
	const initialContext: Msg[] = session.buildContext();
	if (!isResume) {
		const taskMsg: Msg = { role: "user", content: opts.task };
		session.appendMessage(taskMsg);
		initialContext.push(taskMsg);
	}

	const controller = new AbortController();
	const steering = new SteeringQueue();
	const toolCtx: ToolContext = {
		repoRoot: opts.repoRoot,
		cwd: opts.repoRoot,
		signal: controller.signal,
		policy,
		events,
	};
	const deps = {
		provider: opts.provider,
		model: opts.model,
		registry,
		session,
		events,
		memory,
		steering,
		baseSystem: buildSystemPrompt({
			repoRoot: opts.repoRoot,
			cwd: opts.repoRoot,
			model: opts.model,
		}),
		toolCtx,
		signal: controller.signal,
		runId: randomUUID().slice(0, 8),
		repoPath: opts.repoRoot,
		task: opts.task,
		isResume,
		limits,
		initialContext,
	};
	return {
		run: () => runLoop(deps),
		steer: (text: string) => steering.push(text),
		abort: () => controller.abort(),
		events,
		session,
	};
}
