/**
 * Pure mapping between flusk's provider-agnostic types and pi-ai wire types.
 * Only src/provider/pi-ai*.ts may import the pi-ai SDK.
 */
import type {
	AssistantMessage,
	AssistantMessageEvent,
	Context,
	Message,
	StopReason as PiStopReason,
	Usage as PiUsage,
	Tool as PiTool,
	TSchema,
} from "@earendil-works/pi-ai";
import type { AssistantBlock, AssistantMsg, Msg, StopReason, Usage } from "../core/types.js";
import type { StreamEvent, ToolSchemaJson } from "./provider.js";

const PI_TO_HIT_STOP: Record<PiStopReason, StopReason> = {
	stop: "end",
	length: "maxTokens",
	toolUse: "toolUse",
	error: "error",
	aborted: "aborted",
	pending: "error",
	deferred: "error",
};

const HIT_TO_PI_STOP: Record<StopReason, PiStopReason> = {
	end: "stop",
	maxTokens: "length",
	toolUse: "toolUse",
	error: "error",
	aborted: "aborted",
};

export function fromPiStopReason(r: PiStopReason): StopReason {
	return PI_TO_HIT_STOP[r] ?? "error";
}

export function fromPiUsage(u: PiUsage): Usage {
	return { input: u.input, output: u.output, cacheRead: u.cacheRead, costUsd: u.cost.total };
}

function toPiUsage(u: Usage): PiUsage {
	return {
		input: u.input,
		output: u.output,
		cacheRead: u.cacheRead,
		cacheWrite: 0,
		totalTokens: u.input + u.output + u.cacheRead,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: u.costUsd },
	};
}

function toPiAssistantContent(blocks: AssistantBlock[]): AssistantMessage["content"] {
	return blocks.map((b) => {
		if (b.type === "text") return { type: "text" as const, text: b.text };
		if (b.type === "thinking") return { type: "thinking" as const, thinking: b.text };
		return {
			type: "toolCall" as const,
			id: b.id,
			name: b.name,
			arguments: (b.args ?? {}) as Record<string, unknown>,
		};
	});
}

function toPiMessage(m: Msg, timestamp: number): Message {
	if (m.role === "user") return { role: "user", content: m.content, timestamp };
	if (m.role === "toolResult") {
		return {
			role: "toolResult",
			toolCallId: m.callId,
			toolName: m.name,
			content: [{ type: "text", text: m.output }],
			isError: m.isError,
			timestamp,
		};
	}
	return {
		role: "assistant",
		content: toPiAssistantContent(m.content),
		api: "flusk-replay",
		provider: "flusk",
		model: "flusk",
		usage: toPiUsage(m.usage),
		stopReason: HIT_TO_PI_STOP[m.stopReason],
		errorMessage: m.errorMessage,
		timestamp,
	};
}

export function toPiContext(system: string, msgs: Msg[], tools: ToolSchemaJson[]): Context {
	const base = Date.now() - msgs.length;
	const piTools: PiTool[] = tools.map((t) => ({
		name: t.name,
		description: t.description,
		// Typebox schemas are TSchema at runtime; flusk carries them as plain JSON.
		parameters: t.parameters as unknown as TSchema,
	}));
	return {
		systemPrompt: system.length > 0 ? system : undefined,
		messages: msgs.map((m, i) => toPiMessage(m, base + i)),
		tools: piTools.length > 0 ? piTools : undefined,
	};
}

export function fromPiMessage(m: AssistantMessage): AssistantMsg {
	const content: AssistantBlock[] = m.content.map((c) => {
		if (c.type === "text") return { type: "text", text: c.text };
		if (c.type === "thinking") return { type: "thinking", text: c.thinking };
		return { type: "toolCall", id: c.id, name: c.name, args: c.arguments };
	});
	return {
		role: "assistant",
		content,
		stopReason: fromPiStopReason(m.stopReason),
		errorMessage: m.errorMessage,
		usage: fromPiUsage(m.usage),
	};
}

/** Events with no flusk equivalent (start/…_start/…_end bookkeeping) map to null. */
export function fromPiEvent(e: AssistantMessageEvent): StreamEvent | null {
	switch (e.type) {
		case "text_delta":
			return { type: "text_delta", text: e.delta };
		case "thinking_delta":
			return { type: "thinking_delta", text: e.delta };
		case "toolcall_end":
			return {
				type: "toolcall",
				call: {
					type: "toolCall",
					id: e.toolCall.id,
					name: e.toolCall.name,
					args: e.toolCall.arguments,
				},
			};
		case "done":
			return { type: "done", message: fromPiMessage(e.message) };
		case "error":
			return { type: "done", message: fromPiMessage(e.error) };
		default:
			return null;
	}
}
