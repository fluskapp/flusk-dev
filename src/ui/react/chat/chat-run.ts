/**
 * The reply's mechanics as pure functions: recording the wire's cmd/tool/stats
 * chunks, deciding which finished turn carries them, and composing the
 * one-line expander label ("claude -p · 2 tools · $0.021 · 5s"). The hook
 * keeps repaint(); ChatTurnRun renders straight from these.
 */
import type { ChatChunk, ChatTurnRecord } from "../../../features/chat/types.js";
import type { ChatMsg, ChatRun } from "./chat-model.js";
import { appendDelta, type ChatLive, pushError, pushTool } from "./chat-turns.js";

export function newRun(): ChatRun {
	return { tools: [] };
}

/**
 * Apply one wire chunk to the transcript, the live state, and the run record.
 * Returns the conversation id when the chunk announces one; unknown chunk
 * types fall through — forward compatibility.
 */
export function applyChunk(
	msgs: ChatMsg[],
	live: ChatLive,
	run: ChatRun,
	chunk: ChatChunk,
): string | null {
	if (chunk.type === "delta") {
		live.phase = "streaming";
		appendDelta(msgs, chunk.text);
	} else if (chunk.type === "tool") {
		// Tool activity means the model is working, not yet answering.
		live.phase = "waiting";
		pushTool(live, chunk.label);
		run.tools.push(chunk.label);
	} else if (chunk.type === "cmd") {
		run.cmd = chunk.line;
		run.cwd = chunk.cwd;
	} else if (chunk.type === "stats") {
		if (chunk.costUsd !== undefined) run.costUsd = chunk.costUsd;
		if (chunk.durationMs !== undefined) run.durationMs = chunk.durationMs;
		if (chunk.turns !== undefined) run.turns = chunk.turns;
	} else if (chunk.type === "error") {
		run.stderr = chunk.message;
		pushError(msgs, chunk.message);
	} else if (chunk.type === "meta") return chunk.conversationId;
	return null;
}

/** Anything worth an expander? cwd/stderr alone are not — a plain HTTP turn
 *  and a user turn stay bare. */
export function hasRun(run: ChatRun): boolean {
	return (
		run.cmd !== undefined ||
		run.tools.length > 0 ||
		run.costUsd !== undefined ||
		run.durationMs !== undefined ||
		run.turns !== undefined
	);
}

/** Hand the finished run to the turn that CLOSED the reply — the final text,
 *  a stopped partial, or the err line — mirroring what persistence recorded. */
export function attachRun(msgs: ChatMsg[], run: ChatRun): void {
	const last = msgs[msgs.length - 1];
	if (last !== undefined && last.role === "assistant" && hasRun(run)) last.run = run;
}

/** Persisted mechanics → the expander's shape; null when the turn has none. */
export function runFromRecord(t: ChatTurnRecord): ChatRun | null {
	const run: ChatRun = {
		tools: t.tools ?? [],
		...(t.cmd === undefined ? {} : { cmd: t.cmd }),
		...(t.cwd === undefined ? {} : { cwd: t.cwd }),
		...(t.costUsd === undefined ? {} : { costUsd: t.costUsd }),
		...(t.durationMs === undefined ? {} : { durationMs: t.durationMs }),
		...(t.turns === undefined ? {} : { turns: t.turns }),
		...(t.err === true ? { stderr: t.content } : {}),
	};
	return hasRun(run) ? run : null;
}

/** The command's head — binary + first flag — with the elided prompt dropped. */
export function cmdHead(line: string): string {
	return line
		.split(" ")
		.filter((t) => t !== "<prompt>")
		.slice(0, 2)
		.join(" ");
}

/** The collapsed line's text; absent fields are omitted, never zeroed. */
export function runLabel(run: ChatRun): string {
	const parts: string[] = [];
	if (run.cmd !== undefined) parts.push(cmdHead(run.cmd));
	if (run.tools.length > 0) parts.push(`${run.tools.length} tool${run.tools.length === 1 ? "" : "s"}`);
	if (run.costUsd !== undefined) parts.push(`$${run.costUsd.toFixed(run.costUsd < 1 ? 3 : 2)}`);
	if (run.durationMs !== undefined) parts.push(`${Math.round(run.durationMs / 1000)}s`);
	return parts.join(" · ");
}
