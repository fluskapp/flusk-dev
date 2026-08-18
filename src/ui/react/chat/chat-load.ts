/**
 * Restoring the newest conversation from ~/.flusk/chats/ onto the screen.
 * Persisted turns become screen turns: `partial:true` maps to a normal ChatMsg
 * whose content is what arrived; `err:true` maps to ChatMsg.err; `sent` is
 * carried through as the receipt under the typed text.
 */
import { getLatestChat } from "../../../features/chat/chat-history.functions.js";
import type { ChatConversation } from "../../../features/chat/types.js";
import { chatClock, type ChatMsg } from "./chat-model.js";
import { runFromRecord } from "./chat-run.js";

/** ISO → the transcript's clock face (chatClock's format); "" when unreadable. */
export function clockFromIso(iso: string): string {
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "" : chatClock(d);
}

/** Persisted turns → screen turns; recorded mechanics become the expander. */
export function toChatMsgs(c: ChatConversation): ChatMsg[] {
	return c.turns.map((t) => {
		const run = runFromRecord(t);
		return {
			role: t.role,
			content: t.content,
			at: clockFromIso(t.at),
			...(t.err === true ? { err: true } : {}),
			...(t.sent === undefined ? {} : { sent: t.sent }),
			...(run === null ? {} : { run }),
		};
	});
}

/** The newest conversation on disk, shaped for the transcript; null when the
 * store is empty or unreachable — a rail mount must never throw over history. */
export async function fetchLatest(): Promise<{ id: string; msgs: ChatMsg[] } | null> {
	try {
		const c = await getLatestChat();
		return c === null ? null : { id: c.id, msgs: toChatMsgs(c) };
	} catch {
		return null;
	}
}
