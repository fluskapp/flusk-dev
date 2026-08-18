/**
 * Reading and validating a POST /api/chat body.
 *
 * Split from api-chat.ts because "is this a well-formed ChatRequest?" is a
 * pure question worth answering (and testing) without a socket. Everything
 * here throws a message a caller can act on; the route turns that into a 400.
 */
import type { IncomingMessage } from "node:http";
import type { ChatMessage, ChatRequest } from "./types.js";

/** A chat prompt is text. A megabyte of it is already absurd. */
const BODY_MAX = 1_000_000;

/** The one rejection the route answers with 413 rather than 400. */
export const TOO_LARGE = "request body too large";

export function readBody(req: IncomingMessage): Promise<string> {
	return new Promise((done, fail) => {
		const parts: Buffer[] = [];
		let size = 0;
		let over = false;
		req.on("data", (chunk: Buffer) => {
			if (over) return;
			size += chunk.length;
			if (size > BODY_MAX) {
				// Stop ACCUMULATING, not the socket. Destroying it here killed the
				// connection before the route could write its reply, so the client
				// saw ECONNRESET instead of the message that says what was wrong.
				// The rest of the body is read and dropped so the response can be
				// delivered on a socket that is still in a sane state.
				over = true;
				parts.length = 0;
				fail(new Error(TOO_LARGE));
				return;
			}
			parts.push(chunk);
		});
		req.on("end", () => done(Buffer.concat(parts).toString("utf8")));
		req.on("error", fail);
	});
}

/** Server-issued conversation ids: file basenames, so traversal is rejected. */
const CONV_ID = /^[A-Za-z0-9_-]{1,80}$/;

export function parseChatRequest(raw: unknown): ChatRequest {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error("body must be a JSON object");
	}
	const { backendId, messages, cwd, conversationId } = raw as Record<string, unknown>;
	if (typeof backendId !== "string" || backendId === "") throw new Error("backendId is required");
	if (!Array.isArray(messages) || messages.length === 0) {
		throw new Error("messages must be a non-empty array");
	}
	const list: ChatMessage[] = messages.map((m) => {
		const { role, content } = (m ?? {}) as Record<string, unknown>;
		if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
			throw new Error('each message needs role "user"|"assistant" and string content');
		}
		return { role, content };
	});
	if (cwd !== undefined && typeof cwd !== "string") throw new Error("cwd must be a string");
	if (conversationId !== undefined && (typeof conversationId !== "string" || !CONV_ID.test(conversationId))) {
		throw new Error("conversationId must be a server-issued id");
	}
	return {
		backendId,
		messages: list,
		...(typeof cwd === "string" ? { cwd } : {}),
		...(typeof conversationId === "string" ? { conversationId } : {}),
	};
}
