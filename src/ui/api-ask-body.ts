/**
 * Reading and validating a POST /api/ask body.
 *
 * The blocks arrive FROM the panel, which is the whole point: what was on
 * screen is what gets sent, so the wire carries the shown text rather than a
 * key the server re-expands into something the user never saw. That makes
 * validation this file's job — a block is `{id, label, text}` of strings, and
 * a bounded number of them, because the prompt is assembled from whatever is
 * here.
 *
 * Everything throws a sentence the route turns into a 400; the size limit and
 * the reader itself are api-chat-body.ts's, since a chat prompt and an ask
 * prompt are the same kind of payload and one cap is easier to reason about.
 */
import type { AskBlock, AskRequest } from "./ask-types.js";

/** Symbol, span, blast radius, the agent's own prompt — and room to grow. */
export const MAX_BLOCKS = 12;

export function parseAskRequest(raw: unknown): AskRequest {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
		throw new Error("body must be a JSON object");
	}
	const { answererId, question, blocks, cwd } = raw as Record<string, unknown>;
	if (typeof answererId !== "string" || answererId === "") {
		throw new Error("answererId is required");
	}
	if (typeof question !== "string" || question.trim() === "") {
		throw new Error("question is required");
	}
	if (cwd !== undefined && typeof cwd !== "string") throw new Error("cwd must be a string");
	return {
		answererId,
		question,
		blocks: parseBlocks(blocks),
		...(typeof cwd === "string" ? { cwd } : {}),
	};
}

/** An absent `blocks` is a question with no context — allowed, and visible. */
function parseBlocks(raw: unknown): AskBlock[] {
	if (raw === undefined || raw === null) return [];
	if (!Array.isArray(raw)) throw new Error("blocks must be an array");
	if (raw.length > MAX_BLOCKS) throw new Error(`at most ${MAX_BLOCKS} blocks`);
	return raw.map((b) => {
		const { id, label, text } = (b ?? {}) as Record<string, unknown>;
		if (typeof id !== "string" || typeof label !== "string" || typeof text !== "string") {
			throw new Error("each block needs string id, label and text");
		}
		return { id, label, text };
	});
}
