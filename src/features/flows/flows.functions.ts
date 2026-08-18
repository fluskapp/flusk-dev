/**
 * The flows feature's typed server functions — what the /flows route calls
 * instead of the loopback JSON endpoints. Bodies delegate to the same modules
 * flow.router.ts serves (library, checkpointed runs, recomposed sources), so
 * the two surfaces cannot drift while both exist.
 *
 * Everything here is read-only and none of it calls a model — the same
 * invariant the router states: running a flow stays a CLI act, and a page must
 * not be able to spend money.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { flowLibrary, type FlowLibrary } from "./flow.router.js";
import { flowRun, flowRuns, type FlowRunRow } from "./flow-runs.repository.js";
import { withSources } from "./flow-sources.js";

export type { FlowLibrary, FlowView } from "./flow.router.js";
export type { FlowRunRow, FlowRunStep } from "./flow-runs.repository.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** Built-in flows first, then the project's own, plus the files it skipped. */
export const getFlowLibrary = createServerFn().handler(async (): Promise<FlowLibrary> => {
	return flowLibrary(process.cwd());
});

/** Recent flow runs, newest first — steps included, as the checkpoints keep them. */
export const getFlowRuns = createServerFn()
	.inputValidator((data: { project?: string; limit?: number }) => data)
	.handler(async ({ data }): Promise<FlowRunRow[]> => {
		return flowRuns(cfg(), data);
	});

/** One run, or the sentence saying why there is none: the route's error copy
 * must name the reason, so a missing run is never collapsed to a bare null. */
export type FlowRunReply = { run: FlowRunRow; reason?: never } | { run: null; reason: string };

/**
 * One run with each step's prompt SOURCES recomposed the way the run had them.
 * `run: null` carries the reason — the caller's honest banner, not an error.
 */
export const getFlowRun = createServerFn()
	.inputValidator((data: { runId: string }) => data)
	.handler(async ({ data }): Promise<FlowRunReply> => {
		const row = await flowRun(data.runId);
		return row === null
			? { run: null, reason: "no checkpoint was written under that id" }
			: { run: await withSources(row, process.cwd()) };
	});
