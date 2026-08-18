/**
 * Tool window 0: Harness — what runs your code: the loop, its tools, and
 * what it has learned. The report half is awaited (config-cheap); the goal
 * graph is the heavy store open, so it rides as a DEFERRED promise behind
 * Suspense + Await — and a failure degrades to the safe shape rather than
 * rejecting the SSR stream (the runs_.$runId lesson).
 */
import { createFileRoute } from "@tanstack/react-router";
import { type AnatomyReport, getAnatomy } from "../features/anatomy/anatomy.functions.js";
import { getGoalGraph, type GoalGraphReply } from "../features/goals/goals.functions.js";
import { HarnessWindow } from "../ui/react/anatomy/HarnessWindow.js";

interface HarnessLoad {
	report: AnatomyReport;
	goals: Promise<GoalGraphReply>;
}

export const Route = createFileRoute("/harness")({
	ssr: true,
	loader: async (): Promise<HarnessLoad> => ({
		report: (await getAnatomy({ data: {} })) as AnatomyReport,
		goals: getGoalGraph({ data: {} }).catch(
			(): GoalGraphReply => ({ enabled: true, ns: "", goals: [] }),
		) as Promise<GoalGraphReply>,
	}),
	component: Page,
});

function Page() {
	const load = Route.useLoaderData() as HarnessLoad;
	return (
		<div id="harness" className="view">
			<HarnessWindow report={load.report} goals={load.goals} />
		</div>
	);
}
