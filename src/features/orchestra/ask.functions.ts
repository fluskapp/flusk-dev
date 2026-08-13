/**
 * The Ask-AI feature's typed server surface: who can answer, what would be
 * attached, and the SSE stream builder the /api/ask server route delegates to.
 * Bodies call the same modules ask.router.ts / ask-stream.router.ts serve.
 *
 * The stream keeps ask-stream.router.ts's contract exactly:
 *  - the FIRST frame is {type:"prompt"} — the literal text the model receives,
 *    written even for a refusal, so an unavailable answerer is diagnosable;
 *  - `cwd` is validated against allowedCwds (it chooses where a CLI spawns);
 *  - the abort handle lives in the chat router's liveChats set and the client's
 *    disconnect aborts the engine — a killed tab must not leave a detached CLI.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { resolve } from "node:path";
import { loadConfig } from "../../platform/config/config.js";
import type { FluskConfig } from "../../platform/config/types.js";
import { TOO_LARGE } from "../chat/chat-body.js";
import {
	jsonError,
	readJsonCapped,
	sseStreamResponse,
} from "../chat/chat.functions.js";
import { allowedCwds } from "../chat/chat.router.js";
import { createChatEngine } from "../chat/engine.js";
import { askAnswerers } from "./ask-answerers.js";
import { parseAskRequest } from "./ask-body.js";
import { assembleContext } from "./ask-context.js";
import { askPrompt } from "./ask-prompt.js";
import type { Answerer, AskChunk, AskContext, AskRequest } from "./ask.types.js";

export { ASK_ACTIONS } from "./ask-prompt.js";
export type { Answerer, AskAction, AskBlock, AskChunk, AskContext } from "./ask.types.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** ask.router.ts's rule: `repo` scopes the answerer list, but only to a
 * directory this server already trusts — never an arbitrary path on disk. */
const repoOf = (c: FluskConfig, raw: string | undefined): string => {
	if (raw === undefined || raw === "") return process.cwd();
	const path = resolve(raw);
	return allowedCwds(c).includes(path) ? path : process.cwd();
};

/** Everyone who could answer, unavailable rows included (they carry `note`). */
export const getAnswerers = createServerFn()
	.inputValidator((data: { repo?: string }) => data)
	.handler(async ({ data }): Promise<Answerer[]> => {
		const c = cfg();
		return (await askAnswerers(c, repoOf(c, data.repo))).list;
	});

/** A 1-based coordinate, or 0 for "no caret" — which still attaches a span. */
const coord = (n: number | undefined): number => (Number.isInteger(n) && (n as number) >= 1 ? (n as number) : 0);

/** What would be attached for one on-screen position. Never 500s on a half-failure. */
export const getAskContext = createServerFn()
	.inputValidator((data: { file?: string; line?: number; col?: number }) => data)
	.handler(async ({ data }): Promise<AskContext> => {
		return assembleContext(cfg(), {
			file: data.file ?? null,
			line: coord(data.line),
			col: coord(data.col),
		});
	});

async function pumpAnswer(
	write: (chunk: AskChunk) => void,
	c: FluskConfig,
	ask: AskRequest,
	who: Answerer | undefined,
	prompt: string,
	signal: AbortSignal,
): Promise<void> {
	if (who === undefined) {
		write({ type: "error", message: `unknown answerer: ${ask.answererId}` });
		write({ type: "done" });
		return;
	}
	// The reason travels with the row; repeating it beats a spawn failure.
	if (!who.available || who.backendId === null) {
		write({ type: "error", message: who.note ?? `${who.label} is unavailable` });
		write({ type: "done" });
		return;
	}
	const request = {
		backendId: who.backendId,
		messages: [{ role: "user" as const, content: prompt }],
		...(ask.cwd === undefined ? {} : { cwd: ask.cwd }),
	};
	for await (const chunk of createChatEngine(c).stream(request, signal)) {
		write(chunk);
		if (chunk.type === "done") break;
	}
}

/** POST /api/ask's body: the prompt frame first, then the answer, streamed. */
export const askStreamResponse = createServerOnlyFn(async (request: Request): Promise<Response> => {
	const c = cfg();
	let ask: AskRequest;
	try {
		ask = parseAskRequest(await readJsonCapped(request));
		if (ask.cwd !== undefined && !allowedCwds(c).includes(resolve(ask.cwd))) {
			throw new Error("cwd must be a known project path");
		}
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		return jsonError(error === TOO_LARGE ? 413 : 400, error);
	}
	const repoRoot = ask.cwd === undefined ? process.cwd() : resolve(ask.cwd);
	const { list, preambles } = await askAnswerers(c, repoRoot);
	const prompt = askPrompt(ask.question, ask.blocks, preambles.get(ask.answererId));
	const who = list.find((a) => a.id === ask.answererId);
	return sseStreamResponse(request, async (write, signal) => {
		write({ type: "prompt", text: prompt } satisfies AskChunk);
		try {
			await pumpAnswer(write as (chunk: AskChunk) => void, c, ask, who, prompt, signal);
		} catch (e) {
			write({ type: "error", message: e instanceof Error ? e.message : String(e) });
			write({ type: "done" });
		}
	});
});
