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
	/**
	 * Where bash commands execute: absent = /bin/sh on this machine; a
	 * container runtime routes the SAME command through docker exec. The
	 * classifier has already ruled by the time this is consulted — the route
	 * changes the blast radius, never the decision.
	 */
	commandRoute?: (command: string, cwd: string) => { argv0: string; argv: string[] };
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
