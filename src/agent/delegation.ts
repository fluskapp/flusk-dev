/**
 * What a run may hand to someone else, and under what guard.
 *
 * Both ways of delegating hang off ONE decision — the subagent depth cap and
 * the policy that backs it — so they are registered together here rather than
 * as two independent branches inside createAgent. Registering `delegate`
 * separately is how you end up with an agent that is at the depth cap and
 * still holding a tool that spawns another one.
 *
 * `task` runs another flusk loop. `delegate` may instead hand the work to an
 * installed agent CLI or another model. Both share the parent's budget, die
 * with the parent's signal, and count against the same depth.
 */
import { createDelegateTool } from "../orchestra/delegate-tool.js";
import type { ToolRegistry } from "../tools/registry.js";
import { taskTool } from "../tools/task.js";
import type { ToolContext } from "../tools/tool.js";
import type { CreateAgentOpts } from "./agent.js";
import { runSubagent } from "./subagent.js";
import type { BudgetTracker } from "../safety/budget.js";

export interface DelegationWiring {
	opts: CreateAgentOpts;
	budget: BudgetTracker;
	sessionId: string;
	/** The CHILD's depth, i.e. this run's depth + 1. */
	depth: number;
	signal: AbortSignal;
	registry: ToolRegistry;
	toolCtx: ToolContext;
}

export function wireDelegation(w: DelegationWiring): void {
	const spawnCtx = {
		parent: w.opts,
		budget: w.budget,
		parentSessionId: w.sessionId,
		depth: w.depth,
		parentSignal: w.signal,
	};
	w.toolCtx.spawnSubagent = (task: string, kind?: string) => runSubagent(spawnCtx, task, kind);
	w.registry.register(taskTool);
	// Without a config there is no resolved backend list, so an agent spec
	// naming a CLI or an endpoint cannot be checked for availability. The
	// flusk-loop path still works; offering `delegate` that could only guess
	// would be worse than not offering it.
	if (w.opts.config !== undefined) {
		w.registry.register(createDelegateTool(spawnCtx, w.opts.config, w.opts.repoRoot));
	}
}
