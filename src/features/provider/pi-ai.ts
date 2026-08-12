/**
 * PiAiProvider: the real Provider backed by pi-ai's builtin model catalog.
 * Contract: stream() NEVER throws — failures become a done event whose
 * message has stopReason "error" (or "aborted" once the signal fired).
 */
import type { MutableModels } from "@earendil-works/pi-ai";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";
import type { AssistantMsg, ModelRef } from "../run/run.types.js";
import { zeroUsage } from "../run/run.types.js";
import type { ModelChoice } from "../../platform/config/types.js";
import type { CompletionRequest, Provider, StreamEvent } from "./provider.js";
import { fromPiEvent, toPiContext } from "./pi-ai-map.js";

let singleton: MutableModels | undefined;

/** Lazy singleton catalog with all builtin providers (env-API-key auth built in). */
function catalog(): MutableModels {
	singleton ??= builtinModels();
	return singleton;
}

/**
 * Resolves a configured model against the real catalog. Unknown models throw
 * (config-load-time/route-time is allowed to throw; stream() is not).
 */
export function resolveModelRef(choice: ModelChoice): ModelRef {
	const model = catalog().getModel(choice.provider, choice.id);
	if (!model) {
		const available = catalog()
			.getModels(choice.provider)
			.slice(0, 8)
			.map((m) => m.id);
		const hint =
			available.length > 0
				? `available ids include: ${available.join(", ")}`
				: `no models found for provider "${choice.provider}"`;
		throw new Error(`Unknown model "${choice.provider}/${choice.id}"; ${hint}`);
	}
	return { provider: model.provider, id: model.id, contextWindow: model.contextWindow };
}

/** True when the provider has complete auth configuration (e.g. env API key). */
export async function hasAuth(provider: string): Promise<boolean> {
	try {
		return (await catalog().checkAuth(provider)) !== undefined;
	} catch {
		return false;
	}
}

function failureMessage(text: string, signal: AbortSignal): AssistantMsg {
	return {
		role: "assistant",
		content: [],
		stopReason: signal.aborted ? "aborted" : "error",
		errorMessage: text,
		usage: zeroUsage(),
	};
}

export class PiAiProvider implements Provider {
	async *stream(req: CompletionRequest, signal: AbortSignal): AsyncIterable<StreamEvent> {
		let sawDone = false;
		try {
			const model = catalog().getModel(req.model.provider, req.model.id);
			if (!model) {
				yield {
					type: "done",
					message: failureMessage(
						`Unknown model "${req.model.provider}/${req.model.id}"`,
						signal,
					),
				};
				return;
			}
			const context = toPiContext(req.system, req.messages, req.tools);
			const events = catalog().stream(model, context, { signal, maxTokens: req.maxTokens });
			for await (const event of events) {
				const mapped = fromPiEvent(event);
				if (!mapped) continue;
				if (mapped.type === "done") sawDone = true;
				yield mapped;
			}
			if (!sawDone) {
				yield {
					type: "done",
					message: failureMessage("stream ended without a final message", signal),
				};
			}
		} catch (err) {
			if (!sawDone) {
				const text = err instanceof Error ? err.message : String(err);
				yield { type: "done", message: failureMessage(text, signal) };
			}
		}
	}
}
