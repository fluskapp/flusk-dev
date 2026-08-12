/**
 * The Ask-AI panel's contract: what "the context already attached" IS, who can
 * answer, and what goes over the wire.
 *
 * The panel exists so nobody pastes a signature into a chat box by hand. That
 * only works if the attachment is VISIBLE: every block below is rendered in
 * the panel before a question is sent, and POST /api/ask echoes the finished
 * prompt back as its first frame. A hidden prompt is a prompt the user cannot
 * debug — so there is deliberately no field here the client cannot show.
 *
 * A block's `text` is CONTEXT, never instruction. It carries a symbol
 * signature, a span of someone's source, or a blast-radius list; ask-prompt.ts
 * fences and labels it for exactly that reason (S3's rule, applied to local
 * files rather than the web: the same argument holds — data a model receives
 * must not be able to redirect it).
 */
import type { ChatChunk } from "../chat/types.js";
import type { AgentScope } from "./types.js";

/** One attached fact. `id` is stable so the panel can remember exclusions. */
export interface AskBlock {
	id: string;
	/** Shown as the block's heading AND used as the fence label in the prompt. */
	label: string;
	text: string;
}

/** Everything the panel offers to attach for one on-screen position. */
export interface AskContext {
	/** Absolute path of the file the question is about, when there is one. */
	file: string | null;
	symbol: string | null;
	project: string | null;
	blocks: AskBlock[];
	/**
	 * Why a block is missing. Never silent: "no graph has been built for this
	 * project yet" is a different sentence from "this symbol has no callers",
	 * and a panel that shows neither looks broken.
	 */
	notes: string[];
}

/** A one-click action: a pre-filled question over the same context. */
export interface AskAction {
	id: string;
	label: string;
	question: string;
}

/**
 * One thing that can answer. Agents and raw chat backends are listed together
 * because the user is choosing WHO answers, not what kind of thing it is.
 * Unavailable rows stay in the list carrying `note` — a picker that drops a
 * row is a picker you cannot debug (src/chat/detect.ts states the same rule).
 */
export interface Answerer {
	/** "agent:<name>" or "backend:<id>" — opaque to the client. */
	id: string;
	label: string;
	kind: "agent" | "backend";
	/** The ChatBackend the answer will actually stream from; null when none. */
	backendId: string | null;
	/** The backend's label, shown so an agent never hides which model ran. */
	via?: string;
	/**
	 * Where the spec came from. A `project` agent is text a CLONED REPO wrote, so
	 * the picker must SAY so: an agent that reads like the user's own but was
	 * authored by the repo under review is the trust confusion spec-precedence.ts
	 * exists to prevent. Present on every agent row for exactly that reason.
	 */
	scope?: AgentScope;
	description?: string;
	/**
	 * The agent's own prompt, which api-ask-stream.ts puts at the HEAD of the
	 * message — outside the fenced blocks, where it reads as instruction. It
	 * travels on the row so the panel can render it BEFORE Ask is pressed; the
	 * `prompt` frame comes back after the request has already been dispatched,
	 * which is too late to be a disclosure.
	 */
	preamble?: string;
	available: boolean;
	note?: string;
}

/** POST /api/ask. `blocks` is what the panel SHOWED — see api-ask-body.ts. */
export interface AskRequest {
	answererId: string;
	question: string;
	blocks: AskBlock[];
	cwd?: string;
}

/**
 * The stream. `prompt` is the extra frame this route adds and it always comes
 * first: it is the literal text handed to the model, so the panel can show it
 * and a test can prove nothing was smuggled in behind the blocks on screen.
 */
export type AskChunk = ChatChunk | { type: "prompt"; text: string };
