import type { ToolRegistry } from "../tools/registry.js";
import type { Tool, ToolContext } from "../tools/tool.js";
import type { EventBus } from "../../platform/events/events.js";
import type { ToolCall, ToolResultMsg } from "./run.types.js";

function errorText(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** Runs one known tool call: tool:start, validate, execute, tool:end (always). */
async function runKnown(
	call: ToolCall,
	tool: Tool,
	registry: ToolRegistry,
	baseCtx: ToolContext,
	events: EventBus,
): Promise<ToolResultMsg> {
	await events.emit({ type: "tool:start", callId: call.id, name: call.name, args: call.args });
	let output: string;
	let isError = false;
	try {
		const args = registry.validateArgs(tool, call.args);
		const ctx: ToolContext = {
			...baseCtx,
			onUpdate: (partial) => {
				void events.emit({ type: "tool:update", callId: call.id, partial });
			},
		};
		const result = await tool.execute(args as never, ctx);
		output = result.output;
	} catch (e) {
		output = errorText(e);
		isError = true;
	}
	await events.emit({ type: "tool:end", callId: call.id, name: call.name, output, isError });
	return { role: "toolResult", callId: call.id, name: call.name, output, isError };
}

/**
 * Dispatches one assistant batch of tool calls. If any call resolves to a
 * sequential-mode tool (or is unknown), the whole batch runs sequentially in
 * call order; otherwise all calls run concurrently. Either way the returned
 * results are in the original call order. Never throws for tool failures.
 */
export async function dispatchToolCalls(
	calls: ToolCall[],
	registry: ToolRegistry,
	baseCtx: ToolContext,
	events: EventBus,
): Promise<ToolResultMsg[]> {
	const abortedStub = (call: ToolCall): ToolResultMsg => ({
		role: "toolResult",
		callId: call.id,
		name: call.name,
		output: "aborted before execution",
		isError: true,
	});
	// A batch dispatched after abort runs nothing, on either execution path.
	if (baseCtx.signal.aborted) return calls.map(abortedStub);
	const runOne = async (call: ToolCall): Promise<ToolResultMsg> => {
		const tool = registry.get(call.name);
		if (!tool) {
			const available = registry
				.list()
				.map((t) => t.name)
				.join(", ");
			const output = `Unknown tool ${call.name}. Available: ${available || "(none)"}`;
			await events.emit({ type: "tool:start", callId: call.id, name: call.name, args: call.args });
			await events.emit({
				type: "tool:end",
				callId: call.id,
				name: call.name,
				output,
				isError: true,
			});
			return { role: "toolResult", callId: call.id, name: call.name, output, isError: true };
		}
		return runKnown(call, tool, registry, baseCtx, events);
	};

	const forceSequential = calls.some((call) => {
		const tool = registry.get(call.name);
		return !tool || tool.mode === "sequential";
	});
	if (!forceSequential) return Promise.all(calls.map(runOne));
	const results: ToolResultMsg[] = [];
	for (const call of calls) {
		if (baseCtx.signal.aborted) {
			// Preserve the one-result-per-call invariant without running the tool.
			results.push(abortedStub(call));
			continue;
		}
		results.push(await runOne(call));
	}
	return results;
}
