/**
 * Talking to a model from the dashboard. Stable contract — additive changes
 * only, each one an architecture decision recorded in the extending spec.
 *
 * Three kinds of backend, because a senior dev already has models on this
 * machine and should not need a new API key to use them:
 *  - "cli": an agent CLI already installed and authenticated (claude, codex,
 *    kimi). Spawned as a subprocess; uses whatever subscription it has.
 *  - "openai-compatible": any /v1/chat/completions endpoint — OpenRouter,
 *    Ollama, LM Studio, vLLM.
 *  - "pi-ai": the catalog flusk already routes runs through, when keys exist.
 */

export type ChatBackendKind = "cli" | "openai-compatible" | "pi-ai";

export interface ChatBackend {
	id: string;
	label: string;
	kind: ChatBackendKind;
	/** Model id for HTTP backends; the binary name for CLI backends. */
	model?: string;
	/** False when the binary is missing or the endpoint has no credentials. */
	available: boolean;
	/** Why it is unavailable, shown in the picker instead of hiding it. */
	note?: string;
}

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
}

export interface ChatRequest {
	backendId: string;
	messages: ChatMessage[];
	/** Working directory for CLI backends; must be a known project root. */
	cwd?: string;
	/** Conversation to append to (~/.flusk/chats/<id>.jsonl); server issues ids. */
	conversationId?: string;
}

export type ChatChunk =
	| { type: "delta"; text: string }
	/** One tool invocation by the CLI, e.g. "Read src/foo.ts". UI activity line. */
	| { type: "tool"; label: string }
	/** The exact spawned CLI invocation, prompt elided as "<prompt>". Emitted
	 *  once, before any output — even a failing spawn shows what was tried. */
	| { type: "cmd"; line: string; cwd: string }
	/** End-of-run accounting from the CLI's result event; before done. */
	| { type: "stats"; costUsd?: number; durationMs?: number; turns?: number }
	/** First frame of every stream: which conversation the turns land in. */
	| { type: "meta"; conversationId: string }
	| { type: "done" }
	| { type: "error"; message: string };

export interface ChatEngine {
	/** Never throws; probing an absent binary yields available:false. */
	list(): Promise<ChatBackend[]>;
	/** Never throws; failures arrive as an "error" chunk then "done". */
	stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk>;
}

/** One persisted turn, as served to the UI. `at` is ISO-8601 UTC. */
export interface ChatTurnRecord {
	role: "user" | "assistant";
	content: string;
	at: string;
	backendId?: string;
	cwd?: string;
	/** UI-only failure line ("claude not found on PATH"); never replayed. */
	err?: boolean;
	/** Stream ended early (stop/disconnect/crash); content is what arrived. */
	partial?: boolean;
	/** The composed prompt actually sent when attachments rode along. */
	sent?: string;
	/** The exact CLI invocation behind this reply, prompt elided (cmd chunk). */
	cmd?: string;
	/** Every tool invocation the CLI reported, oldest first — uncapped. */
	tools?: string[];
	costUsd?: number;
	durationMs?: number;
	/** Agent turns the CLI reported for this reply (result.num_turns). */
	turns?: number;
}

export interface ChatConversation {
	id: string;
	turns: ChatTurnRecord[];
}

/** ~/.flusk/chats/<id>.jsonl lines. A "turn" supersedes same-seq "partial"s. */
export type ChatLogEntry =
	| { type: "header"; version: 1; id: string; createdAt: string }
	| { type: "turn"; seq: number; turn: ChatTurnRecord }
	| { type: "partial"; seq: number; text: string; at: string };
