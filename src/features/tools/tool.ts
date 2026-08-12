import type { Static, TSchema } from "typebox";
import type { EventBus } from "../../platform/events/events.js";
import type { Policy } from "../safety/policy.js";

export interface ToolResult {
	output: string;
	details?: unknown;
}

export interface ToolContext {
	repoRoot: string;
	cwd: string;
	signal: AbortSignal;
	policy: Policy;
	events: EventBus;
	/** Streaming partial output (long bash commands, subagents). */
	onUpdate?: (partial: string) => void;
	/** Undefined at the subagent depth cap — the task tool is then unregistered. */
	spawnSubagent?: (task: string) => Promise<string>;
}

/**
 * Tools throw on failure; the dispatcher converts throws into isError
 * tool results. "sequential" mode forces the whole batch sequential
 * (bash, write, edit); "parallel" tools (reads, greps) may run concurrently,
 * but results are always appended in call order.
 */
export interface Tool<P extends TSchema = TSchema> {
	name: string;
	description: string;
	parameters: P;
	mode: "sequential" | "parallel";
	execute(args: Static<P>, ctx: ToolContext): Promise<ToolResult>;
}
