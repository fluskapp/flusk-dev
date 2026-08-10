import { Type } from "typebox";
import type { Tool } from "./tool.js";

const params = Type.Object({
	task: Type.String(),
	kind: Type.Optional(Type.String()),
});

/**
 * Delegates a self-contained task to a subagent. Registered only when the
 * agent provides ctx.spawnSubagent (i.e. below the subagent depth cap), so
 * the deepest level never sees this tool in its request tool list.
 */
export const taskTool: Tool<typeof params> = {
	name: "task",
	description:
		"Delegate a self-contained task to a subagent with its own context. " +
		"The subagent works autonomously and returns its final summary as the result. " +
		"Optional kind hints model routing (plan|code|review|summarize).",
	parameters: params,
	mode: "sequential",
	async execute(args, ctx) {
		if (!ctx.spawnSubagent) {
			throw new Error("subagent depth limit reached; the task tool is unavailable");
		}
		// The frozen ToolContext signature takes only the task string; the agent's
		// implementation accepts an optional kind, which is safe to widen to here.
		const spawn = ctx.spawnSubagent as (task: string, kind?: string) => Promise<string>;
		return { output: await spawn(args.task, args.kind) };
	},
};
