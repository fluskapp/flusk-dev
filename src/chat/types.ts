/**
 * Talking to a model from the dashboard. Frozen contract.
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
}

export type ChatChunk =
	| { type: "delta"; text: string }
	| { type: "done" }
	| { type: "error"; message: string };

export interface ChatEngine {
	/** Never throws; probing an absent binary yields available:false. */
	list(): Promise<ChatBackend[]>;
	/** Never throws; failures arrive as an "error" chunk then "done". */
	stream(req: ChatRequest, signal: AbortSignal): AsyncIterable<ChatChunk>;
}
