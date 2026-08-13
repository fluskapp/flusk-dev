/**
 * The unified run feed (client-runs.ts): flusk sessions and harness journals
 * in one dense table, newest first, optionally narrowed to one project or
 * re-sorted by cost. Every row opens the run it stands for.
 */
import { useNavigate } from "@tanstack/react-router";
import type { RunRow } from "../../../features/projects/runs.functions.js";
import { fmtCost, fmtTime } from "./format.js";
import { Pill, Sec } from "./widgets.js";
import "./table.css";
import "./widgets.css";
import "./transcript.css";

type Patch = Record<string, unknown>;

function useOpenSearch() {
	const navigate = useNavigate();
	return (patch: Patch) =>
		navigate({ to: "/runs", search: (prev: Patch) => ({ ...prev, ...patch }) });
}

function FilterBar({ project, sort }: { project?: string; sort?: string }) {
	const open = useOpenSearch();
	if (sort === "cost") {
		return (
			<div className="head-row">
				<h2>Runs by cost</h2>
				<span className="ev" onClick={() => open({ sort: undefined })}>
					show newest first
				</span>
			</div>
		);
	}
	if (project === undefined) {
		return (
			<div className="head-row">
				<h2>All runs</h2>
				<span className="dim">every project · newest first</span>
			</div>
		);
	}
	return (
		<div className="head-row">
			<h2>{project} runs</h2>
			<span className="ev" onClick={() => open({ project: undefined })}>
				show all projects
			</span>
		</div>
	);
}

function Rows({ rows }: { rows: RunRow[] }) {
	const navigate = useNavigate();
	const open = useOpenSearch();
	return (
		<table className="tbl">
			<thead>
				<tr>
					<th>status</th>
					<th>run</th>
					<th>project</th>
					<th>progress</th>
					{/* The cost header is the handle onto the cost sort. */}
					<th className="num">
						<span className="ev" onClick={() => open({ sort: "cost" })}>
							cost
						</span>
					</th>
					<th className="num">when</th>
				</tr>
			</thead>
			<tbody>
				{rows.map((r) => (
					<tr
						key={r.ref}
						data-open={`ref:${r.ref}`}
						title={r.ref}
						onClick={() =>
							navigate({
								to: "/runs/$runId",
								params: { runId: encodeURIComponent(r.ref) },
								search: (prev: Patch) => prev,
							})
						}
					>
						<td>
							<Pill status={r.status} />
						</td>
						<td className="grow">{r.title}</td>
						<td>
							<span
								className="ev"
								onClick={(e) => {
									e.stopPropagation();
									navigate({
										to: "/projects/$project",
										params: { project: r.project },
										search: (prev: Patch) => prev,
									});
								}}
							>
								{r.project}
							</span>
						</td>
						<td className="mono">{r.progress ?? (r.kind === "session" ? "session" : "journal")}</td>
						<td className="num">{r.costUsd === undefined ? "" : fmtCost(r.costUsd)}</td>
						<td className="num">{fmtTime(r.at)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export function RunsView({ rows, project, sort }: { rows: RunRow[]; project?: string; sort?: string }) {
	const shown = sort === "cost" ? [...rows].sort((a, b) => (b.costUsd ?? 0) - (a.costUsd ?? 0)) : rows;
	if (shown.length === 0) {
		return (
			<>
				<FilterBar project={project} sort={sort} />
				<div className="empty small">
					No runs yet.
					<br />
					Run <code>flusk run "task"</code>, or point <code>ui.harnessDirs</code> at a harness's{" "}
					<code>docs/runs</code>.
				</div>
			</>
		);
	}
	const live = shown.filter((r) => r.status === "running");
	const rest = shown.filter((r) => r.status !== "running");
	return (
		<>
			<FilterBar project={project} sort={sort} />
			{live.length > 0 ? (
				<Sec title="Live" count={live.length}>
					<Rows rows={live} />
				</Sec>
			) : null}
			<Sec title="Runs" count={rest.length}>
				<Rows rows={rest} />
			</Sec>
		</>
	);
}
