/**
 * Message and run types owned by flusk. Provider adapters map into these;
 * nothing outside src/provider/pi-ai.ts may import provider-SDK types.
 */

export type StopReason = "end" | "toolUse" | "maxTokens" | "error" | "aborted";

export type RunEndReason =
	| "completed"
	| "error"
	| "aborted"
	| "budget"
	| "maxTurns"
	| "deadline";

export interface TextBlock {
	type: "text";
	text: string;
}

export interface ThinkingBlock {
	type: "thinking";
	text: string;
}

export interface ToolCall {
	type: "toolCall";
	id: string;
	name: string;
	args: unknown;
}

export type AssistantBlock = TextBlock | ThinkingBlock | ToolCall;

export interface Usage {
	input: number;
	output: number;
	cacheRead: number;
	costUsd: number;
}

export function zeroUsage(): Usage {
	return { input: 0, output: 0, cacheRead: 0, costUsd: 0 };
}

export function addUsage(a: Usage, b: Usage): Usage {
	return {
		input: a.input + b.input,
		output: a.output + b.output,
		cacheRead: a.cacheRead + b.cacheRead,
		costUsd: a.costUsd + b.costUsd,
	};
}

export interface UserMsg {
	role: "user";
	content: string;
}

export interface AssistantMsg {
	role: "assistant";
	content: AssistantBlock[];
	stopReason: StopReason;
	errorMessage?: string;
	usage: Usage;
}

export interface ToolResultMsg {
	role: "toolResult";
	callId: string;
	name: string;
	output: string;
	isError: boolean;
}

export type Msg = UserMsg | AssistantMsg | ToolResultMsg;

export interface ModelRef {
	provider: string;
	id: string;
	contextWindow: number;
}

export interface RunStats {
	turns: number;
	usage: Usage;
	startedAt: string;
	endedAt?: string;
}
