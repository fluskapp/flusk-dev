/**
 * The run feature's server surface for the app: start an offline run, list
 * what is live. The event STREAM is not here — it is a server route
 * (src/routes/api/events.$runId.ts), because a stream is a response body,
 * not a value.
 */
import { createServerFn } from "@tanstack/react-start";
import { getLiveRun as liveRun, listLiveRuns, startFakeRun, startRealRun } from "./run-manager.repository.js";
import { explainSession } from "../../cli/explain-cmd.js";
import { resolveSessionPath } from "../../cli/resume-cmd.js";
import type { DecisionLog } from "./decisions.js";

export type { DecisionLog } from "./decisions.js";

// The SSE route needs the live feed itself (a stream is not a serializable
// server-function value); this re-export is the routes-facing seam for it.
export { getLiveRun } from "./run-manager.repository.js";

export interface StartedRun {
	runId: string;
	task: string;
}

export const startRun = createServerFn({ method: "POST" })
	.inputValidator((data: { task: string; fakeScript?: string }) => data)
	.handler(async ({ data }): Promise<StartedRun> => {
		const run = await startFakeRun(data.task, data.fakeScript);
		return { runId: run.runId, task: run.task };
	});

export const getLiveRuns = createServerFn().handler(async (): Promise<StartedRun[]> => {
	return listLiveRuns().map((r) => ({ runId: r.runId, task: r.task }));
});

/** A real run from the workbench — the CLI's machinery, an app's window. */
export const startReal = createServerFn({ method: "POST" })
	.inputValidator((data: { task: string; repoRoot: string; kind?: string }) => data)
	.handler(async ({ data }): Promise<StartedRun> => {
		const run = await startRealRun(data);
		return { runId: run.runId, task: run.task };
	});

export const steerRun = createServerFn({ method: "POST" })
	.inputValidator((data: { runId: string; text: string }) => data)
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		const run = liveRun(data.runId);
		if (run?.steer === undefined) return { ok: false };
		run.steer(data.text);
		return { ok: true };
	});

export const abortRun = createServerFn({ method: "POST" })
	.inputValidator((data: { runId: string }) => data)
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		const run = liveRun(data.runId);
		if (run === undefined) return { ok: false };
		run.abort();
		return { ok: true };
	});

/** The run's account of itself, for the Decisions section of the run page. */
export const getDecisionLog = createServerFn()
	.inputValidator((data: { ref: string }) => data)
	.handler(async ({ data }): Promise<DecisionLog | null> => {
		try {
			return await explainSession(resolveSessionPath(data.ref));
		} catch {
			return null; // a journal ref or a missing file has no session to explain
		}
	});
