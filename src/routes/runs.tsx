/** Runs: the unified feed — flusk sessions and harness journals — filterable
 * by project and status, sortable by cost. The table lives in RunsView. */
import { createFileRoute } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { getRunFeed, type RunRow } from "../features/projects/runs.functions.js";
import { RunsView } from "../ui/react/runs/RunsView.js";

const Search = Type.Object({
	project: Type.Optional(Type.String()),
	status: Type.Optional(Type.String()),
	sort: Type.Optional(Type.String()),
	n: Type.Optional(Type.Number()),
});

type RunsSearch = { project?: string; status?: string; sort?: string; n?: number };

export const Route = createFileRoute("/runs")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loaderDeps: ({ search }) => ({ project: (search as RunsSearch).project }),
	loader: async ({ deps }): Promise<RunRow[]> =>
		getRunFeed({ data: { ...deps, limit: 120 } }) as Promise<RunRow[]>,
	component: RunsPage,
});

function RunsPage() {
	const rows = Route.useLoaderData() as RunRow[];
	const { project, status, sort, n } = Route.useSearch() as RunsSearch;
	const shown = rows
		.filter((r) => (status === undefined ? true : r.status === status))
		.slice(0, n ?? 120);
	return (
		<div id="runs" className="view">
			<RunsView rows={shown} {...(project !== undefined ? { project } : {})} {...(sort !== undefined ? { sort } : {})} />
		</div>
	);
}
