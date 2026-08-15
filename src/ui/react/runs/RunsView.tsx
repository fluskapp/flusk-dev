/**
 * The unified run feed (client-runs.ts): flusk sessions and harness
 * journals in one dense table, newest first, narrowed to a project or
 * re-sorted from the headers. The table is a keyboard surface: focus it,
 * type to speed-search, j/k walk the rows, Enter opens the cursor row.
 */
import { useNavigate } from "@tanstack/react-router";
import type { RunRow } from "../../../features/projects/runs.functions.js";
import { parseSort, type SortState, SortTh, sortRows } from "../kit/sort.js";
import { Hi, NoMatch, SpeedFlag } from "../kit/speed-search.js";
import { composeKeys, useListNav } from "../kit/use-list-nav.js";
import { useSpeedSearch } from "../kit/use-speed-search.js";
import { fmtCost, fmtTime } from "./format.js";
import { FilterBar, Line, Pill, ProjectCell, Sec, useOpenSearch } from "./widgets.js";
import "./table.css";
import "./widgets.css";
import "./transcript.css";

type Patch = Record<string, unknown>;

const runVal = (r: RunRow, col: string): string | number | undefined =>
	col === "cost" ? r.costUsd
	: col === "when" ? r.at
	: col === "run" ? r.title.toLowerCase()
	: col === "project" ? r.project
	: r.status;

const runText = (r: RunRow): string =>
	`${r.title} ${r.project} ${r.status} ${r.progress ?? ""}`.toLowerCase();

function Rows({
	rows,
	base,
	q,
	cursor,
	sort,
	onSort,
	onOpen,
}: {
	rows: RunRow[];
	base: number;
	q: string;
	cursor: number;
	sort: SortState | null;
	onSort: (next: string | undefined) => void;
	onOpen: (r: RunRow, at: number) => void;
}) {
	return (
		<table className="tbl">
			<thead>
				<tr>
					<SortTh col="status" sort={sort} onSort={onSort}>status</SortTh>
					<SortTh col="run" sort={sort} onSort={onSort}>run</SortTh>
					<SortTh col="project" sort={sort} onSort={onSort}>project</SortTh>
					<th>progress</th>
					<SortTh col="cost" sort={sort} onSort={onSort} className="num">cost</SortTh>
					<SortTh col="when" sort={sort} onSort={onSort} className="num">when</SortTh>
				</tr>
			</thead>
			<tbody>
				{rows.map((r, i) => (
					<tr
						key={r.ref}
						data-open={`ref:${r.ref}`}
						data-at={base + i}
						className={base + i === cursor ? "cursor" : ""}
						title={r.ref}
						onClick={() => onOpen(r, base + i)}
					>
						<td>
							<Pill status={r.status} />
						</td>
						<td className="grow">
							<Hi text={r.title} q={q} />
						</td>
						<td>
							<ProjectCell name={r.project} />
						</td>
						<td className="mono">{r.progress ?? r.kind}</td>
						<td className="num">{r.costUsd === undefined ? <span className="off">—</span> : fmtCost(r.costUsd)}</td>
						<td className="num">{fmtTime(r.at)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

export function RunsView({ rows, project, sort }: { rows: RunRow[]; project?: string; sort?: string }) {
	const navigate = useNavigate();
	const open = useOpenSearch();
	const search = useSpeedSearch();
	const q = search.query.toLowerCase();
	const s = parseSort(sort);
	const sorted = sortRows(q === "" ? rows : rows.filter((r) => runText(r).includes(q)), s, runVal);
	const live = sorted.filter((r) => r.status === "running");
	const rest = sorted.filter((r) => r.status !== "running");
	const flat = [...live, ...rest];
	const openRun = (r: RunRow) =>
		navigate({
			to: "/runs/$runId",
			params: { runId: encodeURIComponent(r.ref) },
			search: (prev: Patch) => prev,
		});
	const nav = useListNav(flat.length, (i) => {
		const r = flat[i];
		if (r !== undefined) openRun(r);
	});
	const shared = {
		q: search.query,
		cursor: nav.cursor,
		sort: s,
		onSort: (next: string | undefined) => open({ sort: next }),
		onOpen: (r: RunRow, at: number) => {
			nav.setCursor(at);
			openRun(r);
		},
	};
	/* biome-ignore lint/a11y/noNoninteractiveTabindex: the table is the keyboard surface */
	return (
		<div className="knav" tabIndex={0} ref={nav.ref} onKeyDown={composeKeys(nav, search)}>
			<SpeedFlag q={search.query} shown={flat.length} total={rows.length} />
			<FilterBar project={project} sort={sort} />
			{rows.length === 0 ? (
				<div className="empty small">
					No runs yet.
					<br />
					Run <code>flusk run "task"</code>, or point <code>ui.harnessDirs</code> at a harness's{" "}
					<code>docs/runs</code>.
				</div>
			) : flat.length === 0 ? (
				<Line>
					<NoMatch q={search.query} what="run" clear={search.clear} />
				</Line>
			) : (
				<>
					{live.length > 0 ? (
						<Sec title="Live" count={live.length}>
							<Rows rows={live} base={0} {...shared} />
						</Sec>
					) : null}
					<Sec title="Runs" count={rest.length}>
						<Rows rows={rest} base={live.length} {...shared} />
					</Sec>
				</>
			)}
		</div>
	);
}
