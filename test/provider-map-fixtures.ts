import { fromPiEvent, fromPiMessage, fromPiStopReason, fromPiUsage } from "../src/features/provider/pi-ai-map.js";

// Pi-ai wire types, derived from the adapter's own signatures so tests
// never import the SDK (only src/provider/pi-ai*.ts may).
export type AssistantMessage = Parameters<typeof fromPiMessage>[0];
export type AssistantMessageEvent = Parameters<typeof fromPiEvent>[0];
export type PiStopReason = Parameters<typeof fromPiStopReason>[0];
export type PiUsage = Parameters<typeof fromPiUsage>[0];

export function piUsage(over: Partial<PiUsage> = {}): PiUsage {
	return {
		input: 100,
		output: 20,
		cacheRead: 30,
		cacheWrite: 5,
		totalTokens: 150,
		cost: { input: 0.1, output: 0.2, cacheRead: 0.01, cacheWrite: 0.02, total: 0.33 },
		...over,
	};
}

export function piAssistant(over: Partial<AssistantMessage> = {}): AssistantMessage {
	return {
		role: "assistant",
		content: [{ type: "text", text: "hi" }],
		api: "anthropic-messages",
		provider: "anthropic",
		model: "claude-sonnet-5",
		usage: piUsage(),
		stopReason: "stop",
		timestamp: 123,
		...over,
	};
}
