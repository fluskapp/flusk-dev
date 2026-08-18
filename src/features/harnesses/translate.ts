/**
 * Foreign stdout → run-bus events. streamCli already pipes the child through
 * createCliParser (claude stream-json becomes deltas/tools/stats; plain text
 * passes through), so this translates ChatChunks into the feed's buffered
 * kinds (run.events.ts): `delta` → assistant:delta, `tool` → a start/end pair
 * whose NAME is the 80-char label (lossy on purpose — the parser has no
 * tool_use_id; label-grade fidelity is the contract for foreign runs).
 * `cmd`/`meta`/`done` chunks have no session/bus counterpart and are ignored;
 * `stats` and `error` are returned to the caller, not emitted.
 */
import type { EventBus } from "../../platform/events/events.js";
import type { ChatChunk } from "../chat/types.js";

export interface TranslatedStats {
	costUsd?: number;
	durationMs?: number;
	turns?: number;
}

export interface Translated {
	/** Accumulated assistant text, delta order. */
	text: string;
	/** One label per tool invocation, oldest first. */
	toolLabels: string[];
	stats: TranslatedStats | null;
	error: string | null;
}

export async function translateChunks(
	chunks: AsyncIterable<ChatChunk>,
	events: EventBus,
	runId: string,
): Promise<Translated> {
	const out: Translated = { text: "", toolLabels: [], stats: null, error: null };
	let calls = 0;
	for await (const c of chunks) {
		if (c.type === "delta") {
			out.text += c.text;
			await events.emit({ type: "assistant:delta", text: c.text, channel: "text" });
		} else if (c.type === "tool") {
			out.toolLabels.push(c.label);
			const callId = `${runId}-t${++calls}`;
			await events.emit({ type: "tool:start", callId, name: c.label, args: {} });
			await events.emit({ type: "tool:end", callId, name: c.label, output: "", isError: false });
		} else if (c.type === "stats") {
			out.stats = {
				...(c.costUsd !== undefined ? { costUsd: c.costUsd } : {}),
				...(c.durationMs !== undefined ? { durationMs: c.durationMs } : {}),
				...(c.turns !== undefined ? { turns: c.turns } : {}),
			};
		} else if (c.type === "error") {
			out.error = c.message;
		}
		// cmd/meta/done: the receipt line and engine framing — no counterpart.
	}
	return out;
}
