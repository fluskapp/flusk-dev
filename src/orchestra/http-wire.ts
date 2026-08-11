/**
 * The OpenAI `/chat/completions` wire shape, in both directions.
 *
 * ah's own Msg/ToolCall types are the currency of the loop; an
 * OpenAI-compatible server speaks role-tagged objects with `tool_calls`.
 * Keeping the translation here means src/orchestra/http-provider.ts is only
 * about streaming, and a server that spells one field differently is fixed in
 * one place.
 *
 * The trap this file exists for: tool-call arguments arrive as a STRING that
 * is streamed in fragments across chunks, keyed by `index` (and only the
 * first fragment carries `id` and `name`). Parsing a fragment as it arrives
 * yields half a JSON object, so fragments are concatenated and parsed once at
 * the end.
 */
import type { Msg, ToolCall } from "../core/types.js";
import type { ToolSchemaJson } from "../provider/provider.js";

interface WireCall {
	id: string;
	type: "function";
	function: { name: string; arguments: string };
}

interface WireMessage {
	role: "system" | "user" | "assistant" | "tool";
	content: string;
	tool_calls?: WireCall[];
	tool_call_id?: string;
}

export function toWireMessages(system: string, msgs: Msg[]): WireMessage[] {
	const out: WireMessage[] = [{ role: "system", content: system }];
	for (const msg of msgs) {
		if (msg.role === "user") {
			out.push({ role: "user", content: msg.content });
		} else if (msg.role === "toolResult") {
			out.push({ role: "tool", content: msg.output, tool_call_id: msg.callId });
		} else {
			const text = msg.content
				.filter((b) => b.type === "text")
				.map((b) => b.text)
				.join("");
			const calls = msg.content.filter((b): b is ToolCall => b.type === "toolCall");
			out.push({
				role: "assistant",
				content: text,
				...(calls.length === 0
					? {}
					: {
							tool_calls: calls.map((c) => ({
								id: c.id,
								type: "function" as const,
								function: { name: c.name, arguments: JSON.stringify(c.args ?? {}) },
							})),
						}),
			});
		}
	}
	return out;
}

/** Typebox schemas ARE JSON Schema; they go over the wire verbatim. */
export function toWireTools(tools: ToolSchemaJson[]): unknown[] {
	return tools.map((t) => ({
		type: "function",
		function: { name: t.name, description: t.description, parameters: t.parameters },
	}));
}

export interface WireDelta {
	content?: unknown;
	reasoning_content?: unknown;
	tool_calls?: Array<{
		index?: number;
		id?: string;
		function?: { name?: string; arguments?: string };
	}>;
}

export function deltaOf(data: Record<string, unknown>): WireDelta | undefined {
	return (data as { choices?: Array<{ delta?: WireDelta }> }).choices?.[0]?.delta;
}

/** Accumulator for the fragmented tool-call deltas, keyed by wire index. */
export type CallParts = Map<number, { id: string; name: string; args: string }>;

export function accumulateCalls(parts: CallParts, delta: WireDelta): void {
	for (const [i, tc] of (delta.tool_calls ?? []).entries()) {
		const key = tc.index ?? i;
		const at = parts.get(key) ?? { id: "", name: "", args: "" };
		if (tc.id !== undefined && tc.id !== "") at.id = tc.id;
		if (tc.function?.name !== undefined && tc.function.name !== "") at.name = tc.function.name;
		at.args += tc.function?.arguments ?? "";
		parts.set(key, at);
	}
}

/**
 * Malformed arguments are handed on as the raw string rather than dropped:
 * the registry's validator then reports what the model actually sent, which
 * it can correct on the next turn.
 */
export function finishCalls(parts: CallParts): ToolCall[] {
	return [...parts.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([i, p]) => {
			let args: unknown = {};
			if (p.args.trim() !== "") {
				try {
					args = JSON.parse(p.args);
				} catch {
					args = p.args;
				}
			}
			return {
				type: "toolCall" as const,
				id: p.id === "" ? `call_${i}` : p.id,
				name: p.name,
				args,
			};
		})
		.filter((c) => c.name !== "");
}
