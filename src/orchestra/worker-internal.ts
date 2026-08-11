/**
 * The "internal" worker: ah delegating to ITSELF — the runSubagent path from
 * src/tools/task.ts, generalised so a spec (prompt + tool allow-list) chooses
 * how the child behaves instead of one hardcoded branch in the agent loop.
 *
 * It inherits the parent run's provider deliberately: `backendId` and `model`
 * are ignored here (contract), because this worker's whole point is that it
 * costs no new credential and no new binary. The task kind still routes the
 * child's model through the machinery subagent.ts already owns.
 *
 * Always available: if the parent run can call a model, so can this. Nothing
 * throws — an unusable spec and a failed run are both WorkerResults.
 */
import { classifyTask } from "../provider/intent.js";
import { type LoopCtx, runLoopWorker } from "./delegate.js";
import type { AgentSpec, Worker, WorkerAvailability, WorkerResult, WorkerTask } from "./types.js";

export function internalWorker(ctx: LoopCtx): Worker {
	return {
		kind: "internal",
		available: async (spec: AgentSpec): Promise<WorkerAvailability> =>
			wrongKind(spec) ?? { ok: true },
		run: async (task: WorkerTask): Promise<WorkerResult> => {
			const bad = wrongKind(task.spec);
			if (bad !== undefined) {
				return {
					ok: false,
					summary: `${task.spec.name} was not run: ${bad.reason}`,
					filesTouched: [],
					error: bad.reason ?? "wrong worker",
				};
			}
			try {
				return await runLoopWorker(ctx, task, { kind: classifyTask(task.task) });
			} catch (e) {
				// Belt and braces: runLoopWorker already converts failures, but a
				// Worker that throws would take the whole orchestration down.
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

function wrongKind(spec: AgentSpec): WorkerAvailability | undefined {
	if (spec.worker === "internal") return undefined;
	return { ok: false, reason: `spec "${spec.name}" is worker "${spec.worker}", not "internal"` };
}
