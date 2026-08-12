/**
 * The chat engine: pick a backend, stream it, always terminate.
 *
 * The one invariant every caller depends on is that a stream ends with exactly
 * one "done" — the dashboard closes its SSE connection on it, so a missing
 * done hangs the browser and a second one closes a connection that has already
 * moved on. try/catch/finally guarantees both halves: any escaped throw
 * becomes an "error" chunk first, then the single "done".
 */
import type { FluskConfig } from "../config/types.js";
import { renderPrompt, streamCli } from "./cli-backend.js";
import { listBackends, type ResolvedBackend, resolveBackends } from "./detect.js";
import { streamHttp } from "./http-backend.js";
import type { ChatChunk, ChatEngine, ChatRequest } from "./types.js";

export function createChatEngine(cfg: FluskConfig): ChatEngine {
	return {
		list: async () => listBackends(cfg),
		stream: (req, signal) => streamChat(cfg, req, signal),
	};
}

async function* streamChat(
	cfg: FluskConfig,
	req: ChatRequest,
	signal: AbortSignal,
): AsyncGenerator<ChatChunk> {
	try {
		const backend = resolveBackends(cfg).find((b) => b.backend.id === req.backendId);
		yield* dispatch(backend, req, signal);
	} catch (e) {
		yield { type: "error", message: e instanceof Error ? e.message : String(e) };
	} finally {
		yield { type: "done" };
	}
}

async function* dispatch(
	be: ResolvedBackend | undefined,
	req: ChatRequest,
	signal: AbortSignal,
): AsyncGenerator<ChatChunk> {
	if (be === undefined) {
		yield { type: "error", message: `unknown chat backend: ${req.backendId}` };
		return;
	}
	if (!be.backend.available) {
		// The note already names what is missing; repeating it beats a generic
		// failure from a spawn or a fetch the caller cannot act on.
		yield { type: "error", message: be.backend.note ?? `${be.backend.id} is unavailable` };
		return;
	}
	if (be.config.kind === "cli") {
		yield* streamCli(
			{
				command: be.config.command ?? be.backend.id,
				args: be.args,
				prompt: renderPrompt(req.messages),
				cwd: req.cwd,
			},
			signal,
		);
		return;
	}
	if (be.config.kind === "openai-compatible") {
		yield* streamHttp(be.config, req.messages, signal);
		return;
	}
	yield {
		type: "error",
		message: `${be.backend.id}: pi-ai chat is not wired yet — use a cli or openai-compatible backend`,
	};
}
