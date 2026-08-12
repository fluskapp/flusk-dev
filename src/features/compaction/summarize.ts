import type { AssistantMsg, ModelRef, Msg, TextBlock, Usage } from "../run/run.types.js";
import type { Provider } from "../provider/provider.js";
import { summarizeSystem, summarizeUser } from "./prompt.js";

/**
 * One non-tool provider call that condenses `msgs` (merging `previousSummary`
 * when given) into a handoff summary, returning the summary text plus the
 * call's usage so the caller can count its cost against the run budget.
 * Throws on any provider failure — the caller treats compaction as
 * best-effort and skips it for this turn rather than corrupting the context
 * with a bad or empty summary.
 */
export async function summarizeMessages(
	provider: Provider,
	model: ModelRef,
	msgs: Msg[],
	previousSummary?: string,
	signal?: AbortSignal,
): Promise<{ text: string; usage: Usage }> {
	const req = {
		model,
		system: summarizeSystem(),
		messages: [{ role: "user" as const, content: summarizeUser(msgs, previousSummary) }],
		tools: [],
	};
	let message: AssistantMsg | undefined;
	for await (const ev of provider.stream(req, signal ?? new AbortController().signal)) {
		if (ev.type === "done") message = ev.message;
	}
	if (!message) throw new Error("summarize stream ended without a done message");
	if (message.stopReason === "error" || message.stopReason === "aborted") {
		throw new Error(message.errorMessage ?? `summarize failed: ${message.stopReason}`);
	}
	const text = message.content
		.filter((b): b is TextBlock => b.type === "text")
		.map((b) => b.text)
		.join("");
	if (text.trim() === "") throw new Error("summarize returned no text");
	return { text, usage: message.usage };
}
