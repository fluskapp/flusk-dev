/**
 * The "http" worker: an OpenAI-compatible endpoint driving ah's own loop.
 *
 * This is the cheap seat. The model is whatever the user pointed a backend at
 * — Ollama or LM Studio on this laptop, vLLM on the box next door,
 * OpenRouter — and because the loop is ah's, that model gets the real tools,
 * the same policy, and the same shared budget as any other delegation.
 *
 * The backend (base URL, key env var, binaryless transport) comes only from
 * `config.chat.backends`, which a cloned repo cannot write; an unresolvable
 * `backendId` reports unavailable instead of falling back to the parent's
 * model, so a spec can never quietly re-target work at a paid API.
 */
import type { AhConfig } from "../config/types.js";
import type { ModelRef } from "../core/types.js";
import { specBackend } from "./backend.js";
import { type LoopCtx, runLoopWorker } from "./delegate.js";
import { httpProvider } from "./http-provider.js";
import type { AgentSpec, Worker, WorkerAvailability, WorkerResult, WorkerTask } from "./types.js";

/**
 * These endpoints do not advertise a window and ah only needs it to decide
 * when to compact. 128k is the common floor of the models people actually
 * serve this way; compaction failing safe is a summary, never a lost run.
 */
const ASSUMED_CONTEXT = 128_000;

export function httpWorker(cfg: AhConfig, ctx: LoopCtx): Worker {
	return {
		kind: "http",
		// Probe only: config lookup and an env-var read, no request, no billing.
		available: async (spec: AgentSpec): Promise<WorkerAvailability> => {
			const found = resolve(cfg, spec);
			return "reason" in found ? { ok: false, reason: found.reason } : { ok: true };
		},
		run: async (task: WorkerTask): Promise<WorkerResult> => {
			try {
				const found = resolve(cfg, task.spec);
				if ("reason" in found) {
					return {
						ok: false,
						summary: `${task.spec.name} was not run: ${found.reason}`,
						filesTouched: [],
						error: found.reason,
					};
				}
				const model: ModelRef = {
					provider: found.backendId,
					id: found.model,
					contextWindow: ASSUMED_CONTEXT,
				};
				// No `kind`: the spec already named the model, so the parent run's
				// benchmark routing must not override it.
				return await runLoopWorker(ctx, task, {
					provider: httpProvider(found.config, found.model),
					model,
				});
			} catch (e) {
				const error = e instanceof Error ? e.message : String(e);
				return {
					ok: false,
					summary: `${task.spec.name} crashed: ${error}`,
					filesTouched: [],
					error,
				};
			}
		},
	};
}

type Resolved =
	| { reason: string }
	| { backendId: string; model: string; config: Parameters<typeof httpProvider>[0] };

function resolve(cfg: AhConfig, spec: AgentSpec): Resolved {
	if (spec.worker !== "http") {
		return { reason: `spec "${spec.name}" is worker "${spec.worker}", not "http"` };
	}
	const look = specBackend(cfg, spec, "openai-compatible");
	if (!look.ok) return { reason: look.reason };
	const model = spec.model ?? look.backend.config.model;
	if (model === undefined || model === "") {
		return { reason: `backend "${spec.backendId}" sets no model and the spec names none` };
	}
	return { backendId: look.backend.backend.id, model, config: look.backend.config };
}
