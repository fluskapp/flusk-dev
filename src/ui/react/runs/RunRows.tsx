/**
 * The feed's table, extracted from RunsView so the view keeps under the cap:
 * headers sort, every body row opens. A flow row differs only in its cells —
 * the "flow" kind chip and arrow shape beside the title, its steps as stage
 * chips in progress — never in its behaviour.
 */
import { Link } from "@tanstack/react-router";
import { type SortState, SortTh } from "../kit/sort.js";
import { Hi } from "../kit/speed-search.js";
import { type FeedRow, flowStages } from "./feed-row.js";
import { fmtCost, fmtTime } from "./format.js";
import { StagePipeline } from "./stages.js";
import { ProjectCell, VerdictPill } from "./widgets.js";

type Patch = Record<string, unknown>;

function TitleCell({ r, q }: { r: FeedRow; q: string }) {
	// The title is a real <a> to the row's own address — middle-click, ⌘-click
	// and "copy link address" work in a browser (Tabs.tsx tab-link precedent).
	// A plain click is the Link's navigation; stopPropagation keeps the row's
	// onClick from firing the same one again.
	const body = (
		<>
			<Hi text={r.title} q={q} />
			{r.shape !== undefined && r.shape !== "" ? (
				<span className="dim shape"> {r.shape}</span>
			) : null}
		</>
	);
	return (
		<td className="grow">
			{r.kind === "flow" ? <span className="chip kind">flow</span> : null}
			{r.kind === "flow" ? (
				<Link
					to="/runs"
					search={(prev: Patch) => ({ ...prev, flow: r.id })}
					className="sys-rowlink"
					onClick={(e: React.MouseEvent) => e.stopPropagation()}
				>
					{body}
				</Link>
			) : (
				<Link
					to="/runs/$runId"
					params={{ runId: r.ref }}
					search={(prev: Patch) => prev}
					className="sys-rowlink"
					onClick={(e: React.MouseEvent) => e.stopPropagation()}
				>
					{body}
				</Link>
			)}
		</td>
	);
}

/** Journals carry packed text; a flow row carries the chips themselves. A run
 * that recorded no step has no progress to draw — the column's own em-dash,
 * the same honest absence the files and cost columns print. */
function ProgressCell({ r }: { r: FeedRow }) {
	if (r.steps !== undefined)
		return r.steps.length === 0 ? (
			<td className="mono">
				<span className="off">—</span>
			</td>
		) : (
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
					<SortTh col="verdict" sort={sort} onSort={onSort}>
						verdict
					</SortTh>
					<SortTh col="run" sort={sort} onSort={onSort}>
						run
					</SortTh>
					<SortTh col="project" sort={sort} onSort={onSort}>
						project
					</SortTh>
					<th>progress</th>
					<th className="num">files</th>
					<SortTh col="cost" sort={sort} onSort={onSort} className="num">
						cost
					</SortTh>
					<SortTh col="when" sort={sort} onSort={onSort} className="num">
						when
					</SortTh>
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
							<VerdictPill verdict={r.verdict} status={r.status} />
						</td>
						<TitleCell r={r} q={q} />
						<td>
							<ProjectCell name={r.project} />
						</td>
						<ProgressCell r={r} />
						<td className="num">
							{r.filesTouched === undefined ? <span className="off">—</span> : r.filesTouched}
						</td>
						<td className="num">
							{r.costUsd === undefined ? <span className="off">—</span> : fmtCost(r.costUsd)}
						</td>
						<td className="num">{fmtTime(r.at)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
