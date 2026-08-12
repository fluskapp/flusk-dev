import type { AssistantMsg, ModelRef, Msg, ToolCall } from "../run/run.types.js";

/** Plain JSON Schema for the wire; providers receive these verbatim. */
export interface ToolSchemaJson {
	name: string;
	description: string;
	parameters: Record<string, unknown>;
}

export interface CompletionRequest {
	model: ModelRef;
	system: string;
	messages: Msg[];
	tools: ToolSchemaJson[];
	maxTokens?: number;
}

export type StreamEvent =
	| { type: "text_delta"; text: string }
	| { type: "thinking_delta"; text: string }
	| { type: "toolcall"; call: ToolCall }
	| { type: "done"; message: AssistantMsg };

/**
 * Contract: stream() NEVER throws for request, model, or runtime failures.
 * Failures arrive as the final "done" event whose message has
 * stopReason "error" (or "aborted" when the signal fired). This invariant
 * is what keeps the loop small — it never try/catches provider calls.
 */
export interface Provider {
	stream(req: CompletionRequest, signal: AbortSignal): AsyncIterable<StreamEvent>;
}
