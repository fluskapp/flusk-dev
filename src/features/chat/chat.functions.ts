/**
 * The chat feature's typed server surface for the React workbench: the backend
 * list as a server function, and the SSE stream builder the /api/chat server
 * route delegates to. Bodies call the same modules chat.router.ts serves, so
 * the two surfaces cannot drift while both exist.
 *
 * Two invariants travel from chat.router.ts and MUST hold here too:
 *  - `cwd` is validated against allowedCwds(cfg): a chat request chooses where
 *    a CLI runs, so an unvalidated cwd would pick the directory an agent CLI is
 *    unleashed in.
 *  - The client's disconnect ABORTS the engine, and every live stream is
 *    registered in the SAME liveChats set the legacy router owns — a killed tab
 *    must not leave a detached `claude -p` billing, and UiServer.close() drains
 *    exactly that one set on shutdown.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { resolve } from "node:path";
import { loadConfig } from "../../platform/config/config.js";
import { parseChatRequest, TOO_LARGE } from "./chat-body.js";
import { persistedStream } from "./chat-persist.js";
import { allowedCwds, liveChats } from "./chat.router.js";
import { createChatEngine } from "./engine.js";
import type { ChatBackend, ChatRequest } from "./types.js";

export type { ChatBackend, ChatChunk, ChatMessage, ChatRequest } from "./types.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** The picker's rows. Unavailable backends stay listed, carrying their note. */
export const getChatBackends = createServerFn().handler(async (): Promise<ChatBackend[]> => {
	return createChatEngine(cfg()).list();
});

/** chat-body.ts's cap, applied to a fetch Request body. */
const BODY_MAX = 1_000_000;

/** Read and parse a JSON body under the shared cap; throws chat-body's sentence. */
export const readJsonCapped = createServerOnlyFn(async (request: Request): Promise<unknown> => {
	const raw = await request.text();
	if (raw.length > BODY_MAX) throw new Error(TOO_LARGE);
	return JSON.parse(raw) as unknown;
});

export const jsonError = createServerOnlyFn((status: number, error: string): Response => {
	return new Response(JSON.stringify({ error }), {
		status,
		headers: { "content-type": "application/json; charset=utf-8" },
	});
});

/**
 * An SSE Response whose lifetime is tied to the client: the Request's abort
 * signal (fired when the tab dies) and the stream's cancel() both abort the
 * engine, and the AbortController sits in liveChats until the pump finishes so
 * server shutdown can drain it. `pump` writes frames and resolves when done.
 */
export const sseStreamResponse = createServerOnlyFn(
	(
		request: Request,
		pump: (write: (chunk: unknown) => void, signal: AbortSignal) => Promise<void>,
	): Response => {
		const abort = new AbortController();
		liveChats.add(abort);
		request.signal.addEventListener("abort", () => abort.abort());
		const encoder = new TextEncoder();
		const stream = new ReadableStream<Uint8Array>({
			start(controller) {
				const write = (chunk: unknown): void => {
					// The doomed write that races a disconnect must not raise.
					try {
						controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
					} catch {
						/* stream already cancelled */
					}
				};
				void pump(write, abort.signal).finally(() => {
					liveChats.delete(abort);
					try {
						controller.close();
					} catch {
						/* already closed by cancel */
					}
				});
			},
			cancel() {
				abort.abort();
			},
		});
		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache, no-transform",
				connection: "keep-alive",
			},
		});
	},
);

/**
 * POST /api/chat's body: parse, validate cwd, then hand the engine's stream to
 * the SSE response. The engine emits exactly one "done"; reading stops at it so
 * the browser sees a clean end instead of a hung socket.
 */
export const chatStreamResponse = createServerOnlyFn(async (request: Request): Promise<Response> => {
	const c = cfg();
	let req: ChatRequest;
	try {
		req = parseChatRequest(await readJsonCapped(request));
		if (req.cwd !== undefined && !allowedCwds(c).includes(resolve(req.cwd))) {
			throw new Error("cwd must be a known project path");
		}
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		return jsonError(error === TOO_LARGE ? 413 : 400, error);
	}
	return sseStreamResponse(request, async (write, signal) => {
		try {
			for await (const chunk of persistedStream(req, createChatEngine(c).stream(req, signal))) {
				write(chunk);
				if (chunk.type === "done") break;
			}
		} catch (e) {
			write({ type: "error", message: e instanceof Error ? e.message : String(e) });
			write({ type: "done" });
		}
	});
});
