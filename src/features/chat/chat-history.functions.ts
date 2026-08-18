/**
 * Chat history's typed server surface: the newest conversation, for the
 * workbench's load-on-mount. There is no "new conversation" function — a send
 * without a conversationId lazily creates the file server-side and announces
 * the id in the stream's meta frame.
 */
import { createServerFn } from "@tanstack/react-start";
import { latestConversationId, readConversation } from "./chat-log.repository.js";
import type { ChatConversation } from "./types.js";

export type { ChatConversation, ChatTurnRecord } from "./types.js";

/** Newest conversation on disk, or null when ~/.flusk/chats/ is empty. */
export const getLatestChat = createServerFn().handler(
	async (): Promise<ChatConversation | null> => {
		const id = latestConversationId();
		return id === null ? null : readConversation(id);
	},
);
