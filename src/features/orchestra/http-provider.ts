/**
 * An OpenAI-compatible endpoint as an flusk Provider, so a local model
 * (Ollama, LM Studio, vLLM) or an OpenRouter model drives flusk's OWN tool loop
 * and gets the real read/edit/bash tools instead of chatting about them.
 *
 * Transport is src/chat/http-backend.ts's postSse — the same fetch, auth
 * header, HTTP-failure and SSE framing the dashboard's chat uses. Only the
 * payload mapping lives here, because chat cannot carry tool calls.
 *
 * Provider contract, which the loop depends on: stream() NEVER throws. A dead
 * endpoint, a 500 or a malformed line all arrive as the final "done" message
 * with stopReason "error" (or "aborted" when the signal fired).
 *
 * Usage is reported as zero, not estimated: these endpoints are local or
 * flat-rate and most do not meter a streamed request. That is why the http
 * worker leaves WorkerResult.costUsd absent (unknown) rather than claiming 0.
 */
import { postSse } from "../chat/http-backend.js";
import type { ChatBackendConfig } from "../../platform/config/types.js";
import type { AssistantBlock, AssistantMsg, StopReason } from "../run/run.types.js";
import { zeroUsage } from "../run/run.types.js";
import type { CompletionRequest, Provider, StreamEvent } from "../provider/provider.js";
import {
	accumulateCalls,
	type CallParts,
	deltaOf,
	finishCalls,
	toWireMessages,
	toWireTools,
} from "./http-wire.js";

export function httpProvider(cfg: ChatBackendConfig, model: string): Provider {
	return { stream: (req, signal) => streamCompletion(cfg, model, req, signal) };
}

async function* streamCompletion(
	cfg: ChatBackendConfig,
	model: string,
	req: CompletionRequest,
	signal: AbortSignal,
): AsyncIterable<StreamEvent> {
	const body = {
		model,
		messages: toWireMessages(req.system, req.messages),
		stream: true,
		...(req.tools.length === 0 ? {} : { tools: toWireTools(req.tools) }),
		...(req.maxTokens === undefined ? {} : { max_tokens: req.maxTokens }),
	};
	const parts: CallParts = new Map();
	let text = "";
	let error: string | undefined;
	try {
		for await (const event of postSse(cfg, body, signal)) {
			if ("error" in event) {
				error = event.error;
				break;
			}
			const delta = deltaOf(event.data);
			if (delta === undefined) continue;
			if (typeof delta.content === "string" && delta.content !== "") {
				text += delta.content;
				yield { type: "text_delta", text: delta.content };
			}
			if (typeof delta.reasoning_content === "string" && delta.reasoning_content !== "") {
				yield { type: "thinking_delta", text: delta.reasoning_content };
			}
			accumulateCalls(parts, delta);
		}
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
	if (signal.aborted) {
		yield { type: "done", message: message([], "aborted") };
		return;
	}
	if (error !== undefined) {
		yield { type: "done", message: { ...message([], "error"), errorMessage: error } };
		return;
	}
	const calls = finishCalls(parts);
	for (const call of calls) yield { type: "toolcall", call };
	const content: AssistantBlock[] = text === "" ? [] : [{ type: "text", text }];
	yield {
		type: "done",
		message: message([...content, ...calls], calls.length === 0 ? "end" : "toolUse"),
	};
}

function message(content: AssistantBlock[], stopReason: StopReason): AssistantMsg {
	return { role: "assistant", content, stopReason, usage: zeroUsage() };
}
