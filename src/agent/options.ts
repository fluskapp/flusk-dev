import type { HitConfig } from "../config/types.js";
import type { EventBus } from "../core/events.js";
import type { Limits } from "../core/stop.js";
import type { ModelRef, RunEndReason, RunStats } from "../core/types.js";
import type { MemoryPort } from "../memory/port.js";
import type { Provider } from "../provider/provider.js";
import type { BudgetTracker } from "../safety/budget.js";
import type { Policy } from "../safety/policy.js";
import type { Session } from "../session/session.js";
import type { Tool } from "../tools/tool.js";

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
	/** On resume: injected as a fresh user message after dangling-call repair. */
	steer?: string;
	/** Budgets + compaction thresholds; defaults to DEFAULT_CONFIG. */
	config?: HitConfig;
	/** Model for compaction summaries; defaults to the main model. */
	summarizeModel?: ModelRef;
	/** Routing kind recorded in the session header (plan|code|review|summarize). */
	taskKind?: string;
	/** Links a subagent session to its parent (set by runSubagent). */
	parentSession?: string;
	/** Subagent nesting depth of THIS agent (0 = root); shared budget counts child spend. */
	depth?: number;
	/** Parent agent's abort signal: aborting the parent aborts this agent too. */
	parentSignal?: AbortSignal;
	budget?: BudgetTracker;
	/** Provider override for spawned subagents (tests script children separately). */
	subagentProvider?: (task: string, kind?: string) => Provider;
	/** Active git isolation (CLI-created branch): checkpoint after mutating turns. */
	isolation?: { repoRoot: string; branch: string };
	/** Clock injection for deterministic deadline tests. */
	now?: () => number;
}

export interface Agent {
	run(): Promise<{ reason: RunEndReason; stats: RunStats }>;
	steer(text: string): void;
	abort(): void;
	events: EventBus;
	session: Session;
}
