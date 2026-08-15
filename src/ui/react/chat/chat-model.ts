/**
 * The chat transcript's data shapes and the request body builder, apart from
 * the hook so both stay under the file cap. Ported from client-chat.ts /
 * client-chat-stream.ts.
 */
import type { ChatMessage } from "../../../features/chat/chat.functions.js";
import { askPrompt } from "../../../features/orchestra/ask-prompt.js";
import type { AskBlock } from "../../../features/orchestra/ask.types.js";

/** One turn on screen. `err` turns are UI, never conversation. */
export interface ChatMsg {
	role: "user" | "assistant";
	content: string;
	at: string;
	err?: boolean;
	/** Markup the SERVER produced from the reply text; plain text otherwise. */
	html?: string;
	/**
	 * The composed text the model received when attachments rode along —
	 * preamble, fenced blocks, question (ask-prompt.ts). The transcript shows
	 * `content` (what was typed) and prints this under it as the receipt; the
	 * request carries this. Absent = the two are the same text.
	 */
	sent?: string;
}

/** Turns past this fold to their head with a "show all" toggle. */
export const FOLD_LINES = 40;

/**
 * What actually goes out. With anything on the strip — switched-on blocks or
 * an agent preamble — the ask machinery composes the prompt (fenced blocks,
 * disclosed preamble, the question last); a bare message stays itself.
 * REUSED, not reimplemented: askPrompt is the one compose function.
 */
export function composeOutgoing(text: string, blocks: AskBlock[], preamble: string): string {
	return blocks.length > 0 || preamble !== "" ? askPrompt(text, blocks, preamble) : text;
}

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
		// `sent` over `content`: the wire carries the composed prompt the strip
		// disclosed, while the screen keeps showing what was typed.
		messages: msgs.filter((m) => m.err !== true).map((m) => ({ role: m.role, content: m.sent ?? m.content })),
		...(cwd !== undefined && cwd !== "" ? { cwd } : {}),
	};
}
