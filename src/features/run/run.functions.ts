/**
 * The run feature's server surface for the app: start an offline run, list
 * what is live. The event STREAM is not here — it is a server route
 * (src/routes/api/events.$runId.ts), because a stream is a response body,
 * not a value.
 */
import { createServerFn } from "@tanstack/react-start";
import { listLiveRuns, startFakeRun } from "./run-manager.repository.js";

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
