import type { AssistantMsg, ToolCall, Usage } from "../run/run.types.js";
import { zeroUsage } from "../run/run.types.js";
import type { CompletionRequest, Provider, StreamEvent } from "./provider.js";

/** One scripted assistant turn: optional streamed deltas, then the final message. */
export interface ScriptedTurn {
	deltas?: Array<{ channel: "text" | "thinking"; text: string }>;
	message: AssistantMsg;
}

function testUsage(): Usage {
	return { input: 10, output: 10, cacheRead: 0, costUsd: 0.001 };
}

/** Builds an AssistantMsg with a single text block and stopReason "end". */
export function assistantText(text: string): AssistantMsg {
	return {
		role: "assistant",
		content: [{ type: "text", text }],
		stopReason: "end",
		usage: testUsage(),
	};
}

/** Builds an AssistantMsg carrying tool calls (and optional leading text), stopReason "toolUse". */
export function assistantToolCalls(
	calls: Array<{ id: string; name: string; args: unknown }>,
	text?: string,
): AssistantMsg {
	const content: AssistantMsg["content"] = [];
	if (text !== undefined) content.push({ type: "text", text });
	for (const c of calls) {
		content.push({ type: "toolCall", id: c.id, name: c.name, args: c.args });
	}
	return { role: "assistant", content, stopReason: "toolUse", usage: testUsage() };
}

function exhaustedMessage(): AssistantMsg {
	return {
		role: "assistant",
		content: [],
		stopReason: "error",
		errorMessage: "FakeProvider: script exhausted",
		usage: zeroUsage(),
	};
}

function abortedMessage(): AssistantMsg {
	return { role: "assistant", content: [], stopReason: "aborted", usage: zeroUsage() };
}

/**
 * Script-driven Provider for tests. Each stream() call records the request,
 * consumes the next ScriptedTurn, and replays it as stream events. Never throws:
 * an exhausted script ends with a stopReason "error" done-message, and an
 * aborted signal short-circuits into a stopReason "aborted" done-message.
 */
export class FakeProvider implements Provider {
	readonly requests: CompletionRequest[] = [];
	private cursor = 0;

	constructor(private readonly turns: ScriptedTurn[]) {}

	async *stream(req: CompletionRequest, signal: AbortSignal): AsyncIterable<StreamEvent> {
		this.requests.push(req);
		const turn = this.turns[this.cursor];
		this.cursor += 1;
		if (!turn) {
			yield {
				type: "done",
				message: signal.aborted ? abortedMessage() : exhaustedMessage(),
			};
			return;
		}
		for (const delta of turn.deltas ?? []) {
			if (signal.aborted) {
				yield { type: "done", message: abortedMessage() };
				return;
			}
			yield delta.channel === "text"
				? { type: "text_delta", text: delta.text }
				: { type: "thinking_delta", text: delta.text };
		}
		const calls = turn.message.content.filter((b): b is ToolCall => b.type === "toolCall");
		for (const call of calls) {
			if (signal.aborted) {
				yield { type: "done", message: abortedMessage() };
				return;
			}
			yield { type: "toolcall", call };
		}
		if (signal.aborted) {
			yield { type: "done", message: abortedMessage() };
			return;
		}
		yield { type: "done", message: turn.message };
	}
}
