/** Runs: the unified feed — flusk sessions, harness journals AND flow runs
 * (docs/experience.md: a flow run IS a run) — one table, segmented by ?kind=,
 * filterable by project and status, sortable by cost. ?flow=<id> opens one
 * flow run's detail in place; sessions and journals keep /runs/$runId. */
import { Await, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense } from "react";
import { Type } from "typebox";
import { Value } from "typebox/value";
import {
	getFlowLibrary,
	getFlowRun,
	getFlowRuns,
	type FlowLibrary,
	type FlowRunReply,
	type FlowRunRow,
} from "../features/flows/flows.functions.js";
import { getRunFeed, type RunRow } from "../features/projects/runs.functions.js";
import { type FeedRow, feedKind, mergeRows } from "../ui/react/runs/feed-row.js";
import { FlowRunDetail } from "../ui/react/runs/flows/FlowRunDetail.js";
import { RunsView } from "../ui/react/runs/RunsView.js";

const Search = Type.Object({
	project: Type.Optional(Type.String()),
	status: Type.Optional(Type.String()),
	sort: Type.Optional(Type.String()),
	n: Type.Optional(Type.Number()),
	kind: Type.Optional(Type.String()),
	flow: Type.Optional(Type.String()),
});

type RunsSearch = {
	project?: string;
	status?: string;
	sort?: string;
	n?: number;
	kind?: string;
	flow?: string;
};

interface RunsLoad {
	rows: FeedRow[];
	/** The flow library, only under the Flows segment. */
	lib: FlowLibrary | null;
	/** Un-awaited on purpose (the old /flows idiom): the open flow run's
	 * heavy half — per-step outputs and sources — streams in. */
	run: Promise<FlowRunReply> | null;
}

export const Route = createFileRoute("/runs")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loaderDeps: ({ search }) => {
		const s = search as RunsSearch;
		return { project: s.project, kind: s.kind, flow: s.flow };
	},
	loader: async ({ deps }): Promise<RunsLoad> => {
		const kind = feedKind(deps.kind);
		// Sessions and journals come from the feed; flow runs from the flow
		// checkpoints. Each half loads only when its segment would show it.
		const [feed, flows, lib] = await Promise.all([
			kind === "flow"
				? ([] as RunRow[])
				: (getRunFeed({ data: { project: deps.project, limit: 120 } }) as Promise<RunRow[]>),
			kind === "flow" || kind === "all"
				? (getFlowRuns({ data: { project: deps.project, limit: 40 } }) as Promise<FlowRunRow[]>)
				: ([] as FlowRunRow[]),
			kind === "flow" ? (getFlowLibrary() as Promise<FlowLibrary>) : null,
		]);
		return {
			rows: mergeRows(feed, flows),
			lib,
			run:
				deps.flow === undefined
					? null
					: (getFlowRun({ data: { runId: deps.flow } }) as Promise<FlowRunReply>),
		};
	},
	component: RunsPage,
});

function RunsPage() {
	const load = Route.useLoaderData() as RunsLoad;
	const { project, status, sort, n, kind, flow } = Route.useSearch() as RunsSearch;
	const navigate = useNavigate();
	if (flow !== undefined && load.run !== null) {
		const back = () =>
			void navigate({ to: ".", search: (prev: RunsSearch) => ({ ...prev, flow: undefined }) });
		return (
			<div id="runs" className="view">
				<Suspense fallback={<div className="empty small">reading flow run {flow} …</div>}>
					<Await promise={load.run}>
						{(reply) =>
							reply.run === null ? (
								<div className="empty small">
									Couldn't read flow run {flow} — {reply.reason}. It may never have started, or
									its checkpoint was pruned.{" "}
									<button type="button" className="sys-btn" onClick={back}>
										Back to runs
									</button>
								</div>
							) : (
								<FlowRunDetail run={reply.run} />
							)
						}
					</Await>
				</Suspense>
			</div>
		);
	}
	const k = feedKind(kind);
	const matches = load.rows
		.filter((r) => (k === "all" ? true : r.kind === k))
		.filter((r) => (status === undefined ? true : r.status === status));
	// Live rows ride ahead of the display cap, the same rule runFeed applies:
	// mergeRows re-sorted by date, which would cut an old running row again.
	// The population is RunsView's Live section exactly — sessions and journals
	// still being written — so the hoist and the section cannot disagree.
	const isLive = (r: FeedRow) => r.status === "running" && r.kind !== "flow";
	const shown = [...matches.filter(isLive), ...matches.filter((r) => !isLive(r))].slice(
		0,
		n ?? 120,
	);
	return (
		<div id="runs" className="view">
			<RunsView
				rows={shown}
				kind={k}
				lib={load.lib}
				{...(project !== undefined ? { project } : {})}
				{...(sort !== undefined ? { sort } : {})}
			/>
		</div>
	);
}
