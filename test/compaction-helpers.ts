import type { HitConfig } from "../src/config/types.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { ModelRef, Msg } from "../src/core/types.js";
import { assistantText } from "../src/provider/fake.js";

export const smallModel: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 2000 };

export function compactingConfig(): HitConfig {
	const cfg = structuredClone(DEFAULT_CONFIG);
	cfg.compaction = { reserveTokens: 1500, keepRecentTokens: 100 };
	return cfg;
}

export const user = (text: string): Msg => ({ role: "user", content: text });
export const userContent = (m: Msg | undefined): string => (m?.role === "user" ? m.content : "");
export const toolResult = (id: string): Msg => ({
	role: "toolResult",
	callId: id,
	name: "ping",
	output: "y".repeat(60),
	isError: false,
});

/** 60 alternating user/assistant messages, ~2900 estimated tokens. */
export function transcript60(tag: string): Msg[] {
	const msgs: Msg[] = [];
	for (let i = 0; i < 30; i++) {
		msgs.push(user(`${tag} user ${i} ${"x".repeat(100)}`));
		msgs.push(assistantText(`${tag} reply ${i} ${"x".repeat(100)}`));
	}
	return msgs;
}
