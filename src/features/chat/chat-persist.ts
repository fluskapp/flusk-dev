/**
 * Persistence as a pass-through layer: wraps an engine stream, emits the meta
 * frame first, forwards every chunk unchanged, and appends the conversation to
 * ~/.flusk/chats/<id>.jsonl via chat-log.repository. It sits UNDER the SSE
 * writer in both pumps (chat.functions.ts and the legacy chat.router.ts), so
 * the server — the only party that sees the whole turn even when the tab dies —
 * is the one that records it.
 *
 * `sent` is not reconstructable server-side and is NOT persisted from the
 * wire: the request already carries the composed text as the message content.
 */
import { newConversationId, nextSeq, openChatLog } from "./chat-log.repository.js";
import type { ChatChunk, ChatRequest, ChatTurnRecord } from "./types.js";

/** Minimum ms between partial appends: flush-on-chunk, no timers, so an idle
 *  CLI writes nothing and a crash loses at most ~2s of streamed text. */
const PARTIAL_MS = 2000;

export async function* persistedStream(
	req: ChatRequest,
	chunks: AsyncIterable<ChatChunk>,
): AsyncGenerator<ChatChunk> {
	const id = req.conversationId ?? newConversationId();
	const seq = nextSeq(id);
	const log = openChatLog(id);
	const replySeq = seq + 1;
	let text = "";
	let lastAppendAt = Date.now();
	let lastAppendLen = 0;
	let settled = false; // exactly one assistant-outcome append per reply
	let sawDone = false;
	let inv: { cmd: string; cwd: string } | undefined;
	const tools: string[] = [];
	const stats: { costUsd?: number; durationMs?: number; turns?: number } = {};

	const turn = (fields: Partial<ChatTurnRecord> & { role: "user" | "assistant"; content: string }): ChatTurnRecord => ({
		at: new Date().toISOString(),
		...fields,
	});

	/** The reply's mechanics, attached to whichever turn CLOSES the reply (the
	 *  final text, or the err line) so a reload renders the same expander. */
	const mech = (): Partial<ChatTurnRecord> => ({
		...(inv ?? {}),
		...(tools.length === 0 ? {} : { tools: [...tools] }),
		...stats,
	});

	try {
		const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
		if (lastUser !== undefined) {
			log.append({
				type: "turn",
				seq,
				turn: turn({
					role: "user",
					content: lastUser.content,
					backendId: req.backendId,
					...(req.cwd !== undefined ? { cwd: req.cwd } : {}),
				}),
			});
		}
		yield { type: "meta", conversationId: id };
		for await (const chunk of chunks) {
			if (chunk.type === "delta") {
				text += chunk.text;
				const now = Date.now();
				if (now - lastAppendAt >= PARTIAL_MS && text.length > lastAppendLen) {
					log.append({ type: "partial", seq: replySeq, text, at: new Date().toISOString() });
					lastAppendAt = now;
					lastAppendLen = text.length;
				}
			} else if (chunk.type === "cmd") {
				inv = { cmd: chunk.line, cwd: chunk.cwd };
			} else if (chunk.type === "tool") {
				tools.push(chunk.label);
			} else if (chunk.type === "stats") {
				if (chunk.costUsd !== undefined) stats.costUsd = chunk.costUsd;
				if (chunk.durationMs !== undefined) stats.durationMs = chunk.durationMs;
				if (chunk.turns !== undefined) stats.turns = chunk.turns;
			} else if (chunk.type === "error" && !settled) {
				settled = true;
				if (text !== "") {
					log.append({ type: "turn", seq: replySeq, turn: turn({ role: "assistant", content: text, partial: true }) });
				}
				log.append({
					type: "turn",
					seq: replySeq + 1,
					turn: turn({ role: "assistant", content: chunk.message, err: true, ...mech() }),
				});
			} else if (chunk.type === "done") {
				sawDone = true;
			}
			yield chunk;
		}
	} finally {
		// Idempotent close-out: done, an error, or a mid-stream teardown
		// (stop/disconnect/crash) all land here exactly once.
		if (!settled && text !== "") {
			settled = true;
			log.append({
				type: "turn",
				seq: replySeq,
				turn: turn({ role: "assistant", content: text, ...(sawDone ? {} : { partial: true }), ...mech() }),
			});
		}
		log.close();
	}
}
