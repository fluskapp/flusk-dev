/**
 * The unified run feed: flusk sessions, harness journals AND flow runs in
 * one dense table (docs/experience.md — what happened), newest first,
 * segmented by kind, narrowed to a project or re-sorted from the headers.
 * The table is a keyboard surface: focus it, type to speed-search, j/k walk
 * the rows, Enter opens the cursor row — a session or journal by its ref, a
 * flow run in place (?flow=<id>).
 */
import { useNavigate } from "@tanstack/react-router";
import type { FlowLibrary } from "../../../features/flows/flows.functions.js";
import { parseSort, sortRows } from "../kit/sort.js";
import { NoMatch, SpeedFlag } from "../kit/speed-search.js";
import { composeKeys, useListNav } from "../kit/use-list-nav.js";
import { useSpeedSearch } from "../kit/use-speed-search.js";
import { type FeedKind, type FeedRow, rowText, rowVal } from "./feed-row.js";
import { FlowLibrarySections } from "./flows/Library.js";
import { KindSeg } from "./KindSeg.js";
import { RunRows } from "./RunRows.js";
import { FilterBar, Line, Sec } from "./widgets.js";
import "./table.css";
import "./widgets.css";
import "./transcript.css";

type Patch = Record<string, unknown>;

function Empty({ kind }: { kind: FeedKind }) {
	if (kind === "flow")
		return (
			<div className="empty small">
				No flow runs yet.
				<br />
				Run <code>flusk flow run "task"</code> — the prompts are composed for you.
			</div>
		);
	return (
		<div className="empty small">
			No runs yet.
			<br />
			Run <code>flusk run "task"</code>, or point <code>ui.harnessDirs</code> at a harness's{" "}
			<code>docs/runs</code>.
		</div>
	);
}

export function RunsView({
	rows,
	kind,
	lib,
	project,
	sort,
}: {
	rows: FeedRow[];
	kind: FeedKind;
	lib?: FlowLibrary | null;
	project?: string;
	sort?: string;
}) {
	const navigate = useNavigate();
	const search = useSpeedSearch();
	const q = search.query.toLowerCase();
	const s = parseSort(sort);
	const sorted = sortRows(q === "" ? rows : rows.filter((r) => rowText(r).includes(q)), s, rowVal);
	const live = sorted.filter((r) => r.status === "running");
	const rest = sorted.filter((r) => r.status !== "running");
	const flat = [...live, ...rest];
	// A session or journal has its own page; a flow run opens in place, the
	// way the old Flows window kept the open run in the address bar.
	const openRow = (r: FeedRow) =>
		r.kind === "flow"
			? navigate({ to: "/runs", search: (prev: Patch) => ({ ...prev, flow: r.id }) })
			: navigate({
					to: "/runs/$runId",
					params: { runId: encodeURIComponent(r.ref) },
					search: (prev: Patch) => prev,
				});
	const nav = useListNav(flat.length, (i) => {
		const r = flat[i];
		if (r !== undefined) void openRow(r);
	});
	const openSearch = (patch: Patch) => navigate({ to: "/runs", search: (prev: Patch) => ({ ...prev, ...patch }) });
	const shared = {
		q: search.query,
		cursor: nav.cursor,
		sort: s,
		onSort: (next: string | undefined) => void openSearch({ sort: next }),
		onOpen: (r: FeedRow, at: number) => {
			nav.setCursor(at);
			void openRow(r);
		},
	};
	/* biome-ignore lint/a11y/noNoninteractiveTabindex: the table is the keyboard surface */
	return (
		<div className="knav" tabIndex={0} ref={nav.ref} onKeyDown={composeKeys(nav, search)}>
			<SpeedFlag q={search.query} shown={flat.length} total={rows.length} />
			<FilterBar project={project} sort={sort}>
				<KindSeg kind={kind} />
			</FilterBar>
			{rows.length === 0 ? (
				<Empty kind={kind} />
			) : flat.length === 0 ? (
				<Line>
					<NoMatch q={search.query} what="run" clear={search.clear} />
				</Line>
			) : (
				<>
					{live.length > 0 ? (
						<Sec title="Live" count={live.length}>
							<RunRows rows={live} base={0} {...shared} />
						</Sec>
					) : null}
					<Sec title="Runs" count={rest.length}>
						<RunRows rows={rest} base={live.length} {...shared} />
					</Sec>
				</>
			)}
			{kind === "flow" && lib !== undefined && lib !== null ? <FlowLibrarySections lib={lib} /> : null}
		</div>
	);
}
