/** Runs: sessions and harness journals, filterable by project and status. */
import { createFileRoute } from "@tanstack/react-router";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { getSessions, type SessionSummary } from "../features/projects/projects.functions.js";

const Search = Type.Object({
	project: Type.Optional(Type.String()),
	status: Type.Optional(Type.String()),
	n: Type.Optional(Type.Number()),
});

export const Route = createFileRoute("/runs")({
	ssr: true,
	validateSearch: (input: Record<string, unknown>) => {
		const cleaned = Value.Convert(Search, input);
		return Value.Check(Search, cleaned) ? cleaned : {};
	},
	loaderDeps: ({ search }) => search,
	loader: async (): Promise<SessionSummary[]> => getSessions() as Promise<SessionSummary[]>,
	component: RunsPage,
});

function RunsPage() {
	const sessions = Route.useLoaderData() as SessionSummary[];
	const { project, status, n } = Route.useSearch() as { project?: string; status?: string; n?: number };
	const rows = sessions
		.filter((s) => (project === undefined ? true : s.repoRoot.endsWith(`/${project}`)))
		.filter((s) => (status === undefined ? true : s.status === status))
		.slice(0, n ?? 100);
	return (
		<div id="runs" className="view">
			<h2>Runs</h2>
			<table className="tbl">
				<tbody>
					{rows.map((s) => (
						<tr key={s.key}>
							<td>{s.createdAt}</td>
							<td className="grow">{s.task}</td>
							<td>{s.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
