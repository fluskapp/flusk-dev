/**
 * Any OpenAI-shaped `/chat/completions` endpoint — OpenRouter, Ollama, LM
 * Studio, vLLM. One code path covers all of them because the SSE framing is
 * the one thing they genuinely agree on.
 *
 * Two layers on purpose. `postSse` owns the TRANSPORT (url, auth header,
 * HTTP failure, SSE framing) and yields decoded payloads; `streamHttp` owns
 * the chat mapping (`delta.content` -> ChatChunk). The orchestra's HTTP
 * worker drives flusk's own tool loop over the SAME transport and needs
 * `delta.tool_calls`, which a chat chunk cannot carry — without the split it
 * would have to re-implement fetch + SSE and drift from this file.
 *
 * Like the CLI backend: never throws. A refused connection, a 500, or a line
 * that is not JSON all become an error; the engine appends "done".
 */
import type { ChatBackendConfig } from "../../platform/config/types.js";
import type { ChatChunk, ChatMessage } from "./types.js";

const BODY_TAIL = 500;

/** One decoded `data:` payload, or the single error that ended the stream. */
export type SseEvent = { data: Record<string, unknown> } | { error: string };

function reason(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

/** POSTs `body` and yields each SSE payload until `[DONE]`. Never throws. */
export async function* postSse(
	cfg: ChatBackendConfig,
	body: unknown,
	signal: AbortSignal,
): AsyncGenerator<SseEvent> {
	const url = `${(cfg.baseUrl ?? "").replace(/\/+$/, "")}/chat/completions`;
	const headers: Record<string, string> = {
		"content-type": "application/json",
		accept: "text/event-stream",
	};
	const key = cfg.apiKeyEnv === undefined ? undefined : process.env[cfg.apiKeyEnv];
	if (key !== undefined && key !== "") headers.authorization = `Bearer ${key}`;

	let res: Awaited<ReturnType<typeof fetch>>;
	try {
		res = await fetch(url, { method: "POST", headers, signal, body: JSON.stringify(body) });
	} catch (e) {
		if (!signal.aborted) yield { error: `${url}: ${reason(e)}` };
		return;
	}
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		const tail = text.slice(0, BODY_TAIL).trim();
		yield { error: `HTTP ${res.status} from ${url}${tail ? `: ${tail}` : ""}` };
		return;
	}
	if (res.body === null) {
		yield { error: `${url}: no response body` };
		return;
	}
	yield* parseSse(res.body, signal);
}

/** `data: {json}` lines until `data: [DONE]`; everything else is framing. */
async function* parseSse(body: unknown, signal: AbortSignal): AsyncGenerator<SseEvent> {
	const decoder = new TextDecoder();
	let buf = "";
	try {
		// Node's fetch body is an async-iterable web stream; the cast keeps this
		// file free of DOM lib types.
		for await (const part of body as AsyncIterable<Uint8Array>) {
			buf += decoder.decode(part, { stream: true });
			for (let nl = buf.indexOf("\n"); nl !== -1; nl = buf.indexOf("\n")) {
				const line = buf.slice(0, nl);
				buf = buf.slice(nl + 1);
				const event = parseLine(line);
				if (event === "end") return;
				if (event === null) continue;
				yield event;
				if ("error" in event) return;
			}
		}
	} catch (e) {
		if (!signal.aborted) yield { error: reason(e) };
	}
}

/** null = framing to skip, "end" = the [DONE] terminator. */
function parseLine(raw: string): SseEvent | "end" | null {
	const line = raw.trimEnd();
	if (!line.startsWith("data:")) return null;
	const payload = line.slice(5).trim();
	if (payload === "") return null;
	if (payload === "[DONE]") return "end";
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch {
		return { error: `malformed SSE payload: ${payload.slice(0, 200)}` };
	}
	if (typeof parsed !== "object" || parsed === null) return null;
	return { data: parsed as Record<string, unknown> };
}

/** The chat view of the stream: assistant text only, no tool calls. */
export async function* streamHttp(
	cfg: ChatBackendConfig,
	messages: ChatMessage[],
	signal: AbortSignal,
): AsyncGenerator<ChatChunk> {
	for await (const event of postSse(cfg, { model: cfg.model, messages, stream: true }, signal)) {
		if ("error" in event) {
			yield { type: "error", message: event.error };
			return;
		}
		const text = (event.data as { choices?: Array<{ delta?: { content?: unknown } }> }).choices?.[0]
			?.delta?.content;
		if (typeof text === "string" && text !== "") yield { type: "delta", text };
	}
}
