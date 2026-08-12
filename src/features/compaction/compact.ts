import type { EventBus } from "../../platform/events/events.js";
import type { ModelRef, Msg, Usage } from "../run/run.types.js";
import { addUsage } from "../run/run.types.js";
import type { Provider } from "../provider/provider.js";
import type { CompactionEntry, MessageEntry } from "../session/entries.js";
import type { Session } from "../session/session-file.repository.js";
import { summarizeMessages } from "./summarize.js";

/** Cheap token estimate: serialized chars / 4. */
export function estimateTokens(msgs: Msg[]): number {
	let chars = 0;
	for (const m of msgs) chars += JSON.stringify(m).length;
	return Math.ceil(chars / 4);
}

export function shouldCompact(
	estimated: number,
	contextWindow: number,
	reserveTokens: number,
): boolean {
	return estimated > contextWindow - reserveTokens;
}

/**
 * Index of the first message to keep: walk backward accumulating estimates up
 * to keepRecentTokens, then land on a UserMsg/AssistantMsg boundary so an
 * AssistantMsg with toolCalls is never separated from its ToolResultMsgs.
 * Returns 0 when nothing should be dropped.
 */
export function findCutIndex(msgs: Msg[], keepRecentTokens: number): number {
	let kept = 0;
	let cut = msgs.length;
	for (let i = msgs.length - 1; i >= 0; i--) {
		const msg = msgs[i];
		if (!msg) continue;
		kept += estimateTokens([msg]);
		if (kept > keepRecentTokens) break;
		cut = i;
	}
	while (cut < msgs.length && msgs[cut]?.role === "toolResult") cut += 1;
	if (cut >= msgs.length) {
		// Even the newest message overflows the keep budget: keep the last valid tail.
		cut = 0;
		for (let i = msgs.length - 1; i >= 0; i--) {
			if (msgs[i]?.role !== "toolResult") return i;
		}
	}
	return cut;
}

export interface CompactionCtx {
	provider: Provider;
	summarizeModel: ModelRef;
	contextWindow: number;
	reserveTokens: number;
	keepRecentTokens: number;
	session: Session;
	events: EventBus;
	signal: AbortSignal;
}

/**
 * Compacts state.context in place when it approaches the window: summarizes
 * the dropped prefix, appends a compaction entry, and rebuilds the context to
 * match Session.buildContext exactly (summary-as-user-msg + kept tail).
 * Summarize failures skip compaction for this turn; they never throw upward.
 */
export async function maybeCompact(
	ctx: CompactionCtx,
	state: { context: Msg[]; usage: Usage },
): Promise<void> {
	const tokensBefore = estimateTokens(state.context);
	if (!shouldCompact(tokensBefore, ctx.contextWindow, ctx.reserveTokens)) return;
	const entries = ctx.session.entries;
	let prior: CompactionEntry | undefined;
	for (const e of entries) {
		if (e.type === "compaction") prior = e;
	}
	const offset = prior ? 1 : 0; // context[0] is the prior summary msg, not a session entry
	const cut = findCutIndex(state.context, ctx.keepRecentTokens);
	if (cut <= offset) return;
	const messages = entries.filter((e): e is MessageEntry => e.type === "message");
	const kept = prior ? prior.firstKeptEntryId : 0;
	const visible = messages.filter((e) => e.id >= kept);
	const firstKept = visible[cut - offset];
	if (!firstKept) return; // context/session drifted apart: skip rather than corrupt
	let summary: string;
	try {
		const res = await summarizeMessages(
			ctx.provider,
			ctx.summarizeModel,
			state.context.slice(offset, cut),
			prior?.summary,
			ctx.signal,
		);
		summary = res.text;
		// The summarizer call is real spend: count it into the turn's usage so
		// the loop's per-turn delta records it against the budget.
		state.usage = addUsage(state.usage, res.usage);
	} catch {
		return; // best-effort: run on with the uncompacted context this turn
	}
	ctx.session.appendCompaction({ summary, firstKeptEntryId: firstKept.id, tokensBefore });
	state.context = [
		{ role: "user", content: `Summary of earlier work:\n${summary}` },
		...state.context.slice(cut),
	];
	await ctx.events.emit({
		type: "compaction",
		tokensBefore,
		tokensAfter: estimateTokens(state.context),
	});
}
