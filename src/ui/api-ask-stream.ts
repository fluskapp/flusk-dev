/**
 * POST /api/ask — the answer, streamed.
 *
 * There is exactly ONE streaming path in flusk and this is not a second one: the
 * request is resolved to a `ChatBackend` and handed to `createChatEngine`,
 * which already owns dispatch, abort and the single terminating "done".
 *
 * What this route adds is the frame before the answer. `{type:"prompt"}`
 * carries the literal text the model is about to receive, so the panel can
 * show it and a reader can diff it against the blocks on screen. A prompt the
 * user cannot see is a prompt the user cannot debug — and since the blocks
 * come from the panel, that frame is also the proof nothing was appended
 * behind them. It is written even for a refusal, which is what makes an
 * unavailable answerer diagnosable rather than merely disappointing.
 *
 * `cwd` is checked against the projects the scanner knows (api-chat.ts owns
 * that list) because it chooses the directory a CLI backend is spawned in.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { createChatEngine } from "../chat/engine.js";
import { loadConfig } from "../config/config.js";
import type { FluskConfig } from "../config/types.js";
import { parseAskRequest } from "./api-ask-body.js";
import { allowedCwds, liveChats } from "./api-chat.js";
import { readBody, TOO_LARGE } from "./api-chat-body.js";
import { askAnswerers } from "./ask-answerers.js";
import { askPrompt } from "./ask-prompt.js";
import type { Answerer, AskChunk, AskRequest } from "./ask-types.js";

function write(res: ServerResponse, chunk: AskChunk): void {
	if (!res.writableEnded) res.write(`data: ${JSON.stringify(chunk)}\n\n`);
}

function fail(res: ServerResponse, status: number, error: string): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify({ error }));
}

/**
 * Returns true when it handled the route. Separate from api-ask.ts's handler
 * because this one needs the REQUEST (a body to read) rather than a query
 * string; server.ts calls both, and the prefixes cannot overlap.
 */
export function handleAskStream(
	method: string,
	pathname: string,
	req: IncomingMessage,
	res: ServerResponse,
): boolean {
	if (method !== "POST" || pathname !== "/api/ask") return false;
	void serveAsk(req, res);
	return true;
}

async function serveAsk(req: IncomingMessage, res: ServerResponse): Promise<void> {
	const cfg = loadConfig(process.cwd());
	let ask: AskRequest;
	try {
		ask = parseAskRequest(JSON.parse(await readBody(req)) as unknown);
		if (ask.cwd !== undefined && !allowedCwds(cfg).includes(resolve(ask.cwd))) {
			throw new Error("cwd must be a known project path");
		}
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		fail(res, error === TOO_LARGE ? 413 : 400, error);
		return;
	}
	const repoRoot = ask.cwd === undefined ? process.cwd() : resolve(ask.cwd);
	const { list, preambles } = await askAnswerers(cfg, repoRoot);
	const prompt = askPrompt(ask.question, ask.blocks, preambles.get(ask.answererId));
	const abort = new AbortController();
	liveChats.add(abort);
	// A closed tab must not leave a `claude -p` running: `res` is what reports
	// the disconnect, since `req` already emitted "close" when its body ended.
	res.on("close", () => abort.abort());
	res.on("error", () => {});
	res.writeHead(200, {
		"content-type": "text/event-stream; charset=utf-8",
		"cache-control": "no-cache, no-transform",
		connection: "keep-alive",
	});
	res.flushHeaders();
	write(res, { type: "prompt", text: prompt });
	try {
		await stream(
			res,
			cfg,
			ask,
			list.find((a) => a.id === ask.answererId),
			prompt,
			abort.signal,
		);
	} catch (e) {
		write(res, { type: "error", message: e instanceof Error ? e.message : String(e) });
		write(res, { type: "done" });
	} finally {
		liveChats.delete(abort);
	}
	res.end();
}

async function stream(
	res: ServerResponse,
	cfg: FluskConfig,
	ask: AskRequest,
	who: Answerer | undefined,
	prompt: string,
	signal: AbortSignal,
): Promise<void> {
	if (who === undefined) {
		write(res, { type: "error", message: `unknown answerer: ${ask.answererId}` });
		write(res, { type: "done" });
		return;
	}
	// The reason travels with the row (ask-answerers.ts); repeating it here
	// beats a spawn failure the reader cannot act on.
	if (!who.available || who.backendId === null) {
		write(res, { type: "error", message: who.note ?? `${who.label} is unavailable` });
		write(res, { type: "done" });
		return;
	}
	const request = {
		backendId: who.backendId,
		messages: [{ role: "user" as const, content: prompt }],
		...(ask.cwd === undefined ? {} : { cwd: ask.cwd }),
	};
	for await (const chunk of createChatEngine(cfg).stream(request, signal)) {
		write(res, chunk);
		if (chunk.type === "done") break;
	}
}
