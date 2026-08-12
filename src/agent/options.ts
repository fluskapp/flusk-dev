import type { AhConfig } from "../config/types.js";
import type { ContextSource } from "../context/types.js";
import type { EventBus } from "../core/events.js";
import type { Limits } from "../core/stop.js";
import type { ModelRef, RunEndReason, RunStats } from "../core/types.js";
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
	policy?: Policy;
	events?: EventBus;
	limits?: Partial<Limits>;
	/** Resume an existing session file instead of creating a new one. */
	sessionPath?: string;
	/** On resume: injected as a fresh user message after dangling-call repair. */
	steer?: string;
	/** Budgets + compaction thresholds; defaults to DEFAULT_CONFIG. */
	config?: AhConfig;
	/** Model for compaction summaries; defaults to the main model. */
	summarizeModel?: ModelRef;
	/** Routing kind recorded in the session header (plan|code|review|summarize). */
	taskKind?: string;
	/** Links a subagent session to its parent (set by runSubagent). */
	parentSession?: string;
	/** Subagent nesting depth of THIS agent (0 = root); shared budget counts child spend. */
	depth?: number;
	/** Goal this run serves; recorded on the turn so a run can be traced back
	 * to the task that spawned it. */
	goalId?: string;
	/** Run id override so callers (goal scheduler) can claim tasks up front. */
	runId?: string;
	/** Parent agent's abort signal: aborting the parent aborts this agent too. */
	parentSignal?: AbortSignal;
	budget?: BudgetTracker;
	/** Provider override for spawned subagents (tests script children separately). */
	subagentProvider?: (task: string, kind?: string) => Provider;
	/** Active git isolation (CLI-created branch): checkpoint after mutating turns. */
	isolation?: { repoRoot: string; branch: string };
	/** Clock injection for deterministic deadline tests. */
	now?: () => number;
	/**
	 * Sources for the run-start context block; defaults to the six registered
	 * ones. Injected by tests, which need a source that misbehaves on purpose.
	 */
	contextSources?: readonly ContextSource[];
}

export interface Agent {
	run(): Promise<{ reason: RunEndReason; stats: RunStats }>;
	/** Re-enter the loop on the SAME session (fresh run id) with a steering
	 * user message — the verify gate's retry path, built on resume machinery. */
	continueRun(steer: string): Promise<{ reason: RunEndReason; stats: RunStats }>;
	steer(text: string): void;
	abort(): void;
	events: EventBus;
	session: Session;
}
