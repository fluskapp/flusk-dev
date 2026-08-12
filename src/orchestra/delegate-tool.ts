/**
 * The tool that makes the orchestrator reachable.
 *
 * Everything under src/orchestra — the registry, the three workers, the
 * router — was built and tested but imported by nothing outside its own
 * directory and its tests. From inside a run there was still exactly one way
 * to delegate: `task`, which spawns another flusk loop on flusk's own provider.
 * A capability nothing can invoke is a capability the product does not have.
 *
 * This is the seam. `delegate` names an agent, or lets the router pick one,
 * and the work may land in flusk's own loop, in an installed agent CLI working
 * in the directory, or in an OpenAI-compatible model driving flusk's tools.
 *
 * Registered beside `task` and under the same guard, because a delegation is
 * a subagent by another name: it shares the parent's budget, dies with the
 * parent's signal, and counts against the same depth cap.
 */
import { Type } from "typebox";
import { listBackends } from "../chat/detect.js";
import type { FluskConfig } from "../config/types.js";
import type { Tool } from "../tools/tool.js";
import type { LoopCtx } from "./delegate.js";
import { loadAgentRegistry } from "./registry.js";
import { routeTask } from "./route.js";
import type { AgentSpec, WorkerResult } from "./types.js";
import { createWorkers, workerLookup } from "./workers.js";

const params = Type.Object({
	task: Type.String(),
	agent: Type.Optional(Type.String()),
});

/** What the model is told came back. Failure is reported, never thrown away. */
function render(spec: AgentSpec, why: string, r: WorkerResult): string {
	const head = `agent: ${spec.name} (${spec.worker}${spec.backendId === undefined ? "" : `:${spec.backendId}`}) — ${why}`;
	const files =
		r.filesTouched.length === 0
			? "files touched: none"
			: `files touched (${r.filesTouched.length}):\n${r.filesTouched.map((f) => `  ${f}`).join("\n")}`;
	// The summary is agent-authored text. It is fenced and labelled so it reads
	// as a REPORT on work done, never as instructions to the agent reading it.
	return [
		head,
		r.ok ? "" : `FAILED: ${r.error ?? "no reason given"}`,
		files,
		"--- begin delegated agent report ---",
		r.summary,
		"--- end delegated agent report ---",
	]
		.filter((s) => s !== "")
		.join("\n");
}

export function createDelegateTool(ctx: LoopCtx, cfg: FluskConfig, repoRoot: string): Tool<typeof params> {
	return {
		name: "delegate",
		description:
			"Delegate a self-contained task to a named coding agent, or let flusk choose one. " +
			"Unlike `task`, the work may run in an installed agent CLI or another model, " +
			"not only in flusk's own loop. Omit `agent` to route by the task's description. " +
			"Returns the agent's report and the files it actually changed.",
		parameters: params,
		mode: "sequential",
		async execute(args, toolCtx) {
			const registry = await loadAgentRegistry({
				repoRoot,
				backends: listBackends(cfg),
			});
			const workers = createWorkers(cfg, ctx);

			let spec: AgentSpec | undefined;
			let why: string;
			if (args.agent === undefined) {
				const routed = await routeTask({
					task: args.task,
					registry,
					workerFor: workerLookup(workers),
					config: cfg,
				});
				// No agent fits, or none that fits is installed. Say which, rather
				// than silently running something the caller did not ask for.
				if (!routed.ok) throw new Error(`no agent can take this task: ${routed.reason}`);
				spec = routed.spec;
				why = routed.why;
			} else {
				spec = registry.get(args.agent);
				if (spec === undefined) {
					const known = registry
						.list()
						.map((s) => s.name)
						.join(", ");
					throw new Error(`unknown agent "${args.agent}"; available: ${known || "none"}`);
				}
				const avail = registry.available(spec);
				if (!avail.ok) throw new Error(`agent "${spec.name}" cannot run: ${avail.reason}`);
				why = "named by the caller";
			}

			const worker = workers[spec.worker];
			const result = await worker.run({
				spec,
				task: args.task,
				cwd: repoRoot,
				signal: toolCtx.signal,
			});
			return { output: render(spec, why, result) };
		},
	};
}
