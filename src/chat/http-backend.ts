/**
 * Any OpenAI-shaped `/chat/completions` endpoint — OpenRouter, Ollama, LM
 * Studio, vLLM. One code path covers all of them because the SSE framing is
 * the one thing they genuinely agree on.
 *
 * Like the CLI backend: never throws. A refused connection, a 500, or a line
 * that is not JSON all become an "error" chunk; the engine appends "done".
 */
import type { ChatBackendConfig } from "../config/types.js";
import type { ChatChunk, ChatMessage } from "./types.js";

const BODY_TAIL = 500;

function reason(e: unknown): string {
	return e instanceof Error ? e.message : String(e);
}

export async function* streamHttp(
	cfg: ChatBackendConfig,
	messages: ChatMessage[],
	signal: AbortSignal,
): AsyncGenerator<ChatChunk> {
	const url = `${(cfg.baseUrl ?? "").replace(/\/+$/, "")}/chat/completions`;
	const headers: Record<string, string> = {
		"content-type": "application/json",
		accept: "text/event-stream",
	};
	const key = cfg.apiKeyEnv === undefined ? undefined : process.env[cfg.apiKeyEnv];
	if (key !== undefined && key !== "") headers.authorization = `Bearer ${key}`;

	let res: Awaited<ReturnType<typeof fetch>>;
	try {
		res = await fetch(url, {
			method: "POST",
			headers,
			signal,
			body: JSON.stringify({ model: cfg.model, messages, stream: true }),
		});
	} catch (e) {
		if (!signal.aborted) yield { type: "error", message: `${url}: ${reason(e)}` };
		return;
	}
	if (!res.ok) {
		const body = await res.text().catch(() => "");
		const tail = body.slice(0, BODY_TAIL).trim();
		yield { type: "error", message: `HTTP ${res.status} from ${url}${tail ? `: ${tail}` : ""}` };
		return;
	}
	if (res.body === null) {
		yield { type: "error", message: `${url}: no response body` };
		return;
	}
	yield* parseSse(res.body, signal);
}

/** `data: {json}` lines until `data: [DONE]`; everything else is framing. */
async function* parseSse(body: unknown, signal: AbortSignal): AsyncGenerator<ChatChunk> {
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
				const chunk = parseLine(line);
				if (chunk === "end") return;
				if (chunk === null) continue;
				yield chunk;
				if (chunk.type === "error") return;
			}
		}
	} catch (e) {
		if (!signal.aborted) yield { type: "error", message: reason(e) };
	}
}

/** null = framing to skip, "end" = the [DONE] terminator. */
function parseLine(raw: string): ChatChunk | "end" | null {
	const line = raw.trimEnd();
	if (!line.startsWith("data:")) return null;
	const payload = line.slice(5).trim();
	if (payload === "") return null;
	if (payload === "[DONE]") return "end";
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload);
	} catch {
		return { type: "error", message: `malformed SSE payload: ${payload.slice(0, 200)}` };
	}
	const text = (parsed as { choices?: Array<{ delta?: { content?: unknown } }> }).choices?.[0]
		?.delta?.content;
	return typeof text === "string" && text !== "" ? { type: "delta", text } : null;
}
