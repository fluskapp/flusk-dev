/**
 * Tool window 7: Flows — the flow library, recent flow runs, and one run's
 * steps with the sources their prompts were composed from. The open run lives
 * in ?run=<id> (the address bar names the run); its steps carry every output
 * block, so that half of the payload is DEFERRED behind the light halves.
 */
import { Await, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { Type } from "typebox";
import { Value } from "typebox/value";
import {
	getFlowLibrary,
	getFlowRun,
	getFlowRuns,
	type FlowLibrary,
	type FlowRunRow,
} from "../features/flows/flows.functions.js";
import { FlowRunDetail } from "../ui/react/flows/FlowRunDetail.js";
import { FlowsView } from "../ui/react/flows/FlowsView.js";

const Search = Type.Object({ run: Type.Optional(Type.String()) });

interface FlowsLoad {
	lib: FlowLibrary;
	runs: FlowRunRow[];
	/** Un-awaited on purpose: the heavy half (per-step outputs) streams in. */
	run: Promise<FlowRunRow | null> | null;
}

export const Route = createFileRoute("/flows")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loaderDeps: ({ search }) => search,
	loader: async ({ deps }): Promise<FlowsLoad> => {
		const run = (deps as { run?: string }).run;
		// The library and the run list are independent reads: parallel, not
		// a waterfall. The open run stays un-awaited (deferred) as before.
		const [lib, runs] = await Promise.all([
			getFlowLibrary() as Promise<FlowLibrary>,
			getFlowRuns({ data: { limit: 40 } }) as Promise<FlowRunRow[]>,
		]);
		return {
			lib,
			runs,
			run: run === undefined ? null : (getFlowRun({ data: { runId: run } }) as Promise<FlowRunRow | null>),
		};
	},
	component: Page,
});

function Page() {
	const data = Route.useLoaderData() as FlowsLoad;
	const search = Route.useSearch() as { run?: string };
	const navigate = useNavigate();
	const openRun = (runId: string) => void navigate({ to: ".", search: { run: runId } });
	const back = () => void navigate({ to: ".", search: {} });
	return (
		<div id="flows" className="view">
			{search.run !== undefined && data.run !== null ? (
				<Suspense fallback={<div className="empty small">reading that run …</div>}>
					<Await promise={data.run}>
						{(run) =>
							run === null ? (
								<div className="empty small">could not read that run</div>
							) : (
								<FlowRunDetail run={run} onBack={back} />
							)
						}
					</Await>
				</Suspense>
			) : (
				<FlowsView lib={data.lib} runs={data.runs} onOpen={openRun} />
			)}
		</div>
	);
}
