/**
 * The feed's table, extracted from RunsView so the view keeps under the cap:
 * headers sort, every body row opens. A flow row differs only in its cells —
 * the "flow" kind chip and arrow shape beside the title, its steps as stage
 * chips in progress — never in its behaviour.
 */
import { type SortState, SortTh } from "../kit/sort.js";
import { Hi } from "../kit/speed-search.js";
import { type FeedRow, flowStages } from "./feed-row.js";
import { fmtCost, fmtTime } from "./format.js";
import { StagePipeline } from "./stages.js";
import { Pill, ProjectCell } from "./widgets.js";

function TitleCell({ r, q }: { r: FeedRow; q: string }) {
	return (
		<td className="grow">
			{r.kind === "flow" ? <span className="chip kind">flow</span> : null}
			<Hi text={r.title} q={q} />
			{r.shape !== undefined && r.shape !== "" ? <span className="dim shape"> {r.shape}</span> : null}
		</td>
	);
}

/** Journals carry packed text; a flow row carries the chips themselves. */
function ProgressCell({ r }: { r: FeedRow }) {
	if (r.steps !== undefined)
		return (
			<td>
				<StagePipeline rows={flowStages(r.steps)} />
			</td>
		);
	return <td className="mono">{r.progress ?? r.kind}</td>;
}

export function RunRows({
	rows,
	base,
	q,
	cursor,
	sort,
	onSort,
	onOpen,
}: {
	rows: FeedRow[];
	base: number;
	q: string;
	cursor: number;
	sort: SortState | null;
	onSort: (next: string | undefined) => void;
	onOpen: (r: FeedRow, at: number) => void;
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
						key={`${r.kind}:${r.id}`}
						data-open={r.kind === "flow" ? `flow:${r.id}` : `ref:${r.ref}`}
						data-at={base + i}
						className={base + i === cursor ? "cursor" : ""}
						title={r.kind === "flow" ? r.id : r.ref}
						onClick={() => onOpen(r, base + i)}
					>
						<td>
							<Pill status={r.status} />
						</td>
						<TitleCell r={r} q={q} />
						<td>
							<ProjectCell name={r.project} />
						</td>
						<ProgressCell r={r} />
						<td className="num">{r.costUsd === undefined ? <span className="off">—</span> : fmtCost(r.costUsd)}</td>
						<td className="num">{fmtTime(r.at)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
