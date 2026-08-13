/**
 * The chat transcript's data shapes and the request body builder, apart from
 * the hook so both stay under the file cap. Ported from client-chat.ts /
 * client-chat-stream.ts.
 */
import type { ChatMessage } from "../../../features/chat/chat.functions.js";

/** One turn on screen. `err` turns are UI, never conversation. */
export interface ChatMsg {
	role: "user" | "assistant";
	content: string;
	at: string;
	err?: boolean;
	/** Markup the SERVER produced from the reply text; plain text otherwise. */
	html?: string;
}

export const CHAT_KEY = "flusk-chat-backend";

export function chatClock(): string {
	return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * The request body. Flagged turns are dropped: "claude not found on PATH"
 * replayed to the model as its own last turn is not conversation, it is
 * poison in the next prompt.
 */
export function chatBody(
	backendId: string,
	msgs: ChatMsg[],
	cwd: string | undefined,
): { backendId: string; messages: ChatMessage[]; cwd?: string } {
	return {
		backendId,
		messages: msgs.filter((m) => m.err !== true).map((m) => ({ role: m.role, content: m.content })),
		...(cwd !== undefined && cwd !== "" ? { cwd } : {}),
	};
}
