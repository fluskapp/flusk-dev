/**
 * The three workers, wired as one lookup.
 *
 * A caller (the task tool, the goal scheduler, the router) should not have to
 * know which module implements which kind, and should never be able to end up
 * with a half-built set: every AgentWorkerKind in the contract resolves here,
 * so an unavailable agent is reported by available() with a reason instead of
 * looking like a missing worker.
 */
import type { AhConfig } from "../config/types.js";
import type { LoopCtx } from "./delegate.js";
import type { AgentWorkerKind, Worker } from "./types.js";
import { cliWorker } from "./worker-cli.js";
import { httpWorker } from "./worker-http.js";
import { internalWorker } from "./worker-internal.js";

export function createWorkers(cfg: AhConfig, ctx: LoopCtx): Record<AgentWorkerKind, Worker> {
	return {
		internal: internalWorker(ctx),
		cli: cliWorker(cfg),
		http: httpWorker(cfg, ctx),
	};
}

/** Ready to hand to routeTask as `workerFor`. */
export function workerLookup(
	workers: Record<AgentWorkerKind, Worker>,
): (kind: AgentWorkerKind) => Worker | undefined {
	return (kind) => workers[kind];
}
