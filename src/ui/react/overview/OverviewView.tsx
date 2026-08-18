/**
 * Attention/Overview, styled: stat tiles in the shared .stats-row grid
 * (kit/Tile.tsx — the one counter language), recent activity as clickable
 * verdict-first rows — verdict pill leading, state restated in it, the row
 * itself the one next action (open the run), its title a real link.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import type { Overview } from "../../../features/projects/projects.functions.js";
import type { SetupStatus } from "../../../features/setup/setup.functions.js";
import { Tile } from "../kit/Tile.js";
import { fmtTime } from "../runs/format.js";
import { VerdictPill } from "../runs/widgets.js";
import { SetupBanner } from "./SetupBanner.js";
import "./overview.css";

export function OverviewView({
	overview,
	setup,
	queue,
}: {
	overview: Overview;
	setup: SetupStatus;
	queue?: React.ReactNode;
}) {
	const navigate = useNavigate();
	// The RAW ref: the router does the one URI encoding (format.ts decodeRef).
	const open = (ref: string) =>
		void navigate({
			to: "/runs/$runId",
			params: { runId: ref },
			search: (prev: Record<string, unknown>) => prev,
		});
	return (
		<div id="overview" className="view">
			<h2>Attention</h2>
			<div className="stats-row">
				{overview.stats.map((s) => (
					<Tile key={s.label} value={s.value} label={s.label} hint={s.hint} />
				))}
			</div>
			<SetupBanner setup={setup} />
			{queue}
			<h3>Recent activity</h3>
			<ul className="ov-act">
				{overview.activity.map((a) => (
					<li
						key={`${a.kind}:${a.ref}:${a.at}`}
						title={a.ref}
						// biome-ignore lint/a11y/noNoninteractiveTabindex: the row is the keyboard surface (RunsView precedent)
						tabIndex={0}
						onClick={() => open(a.ref)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								open(a.ref);
							}
						}}
					>
						<VerdictPill verdict={a.verdict} status={a.status} />
						{/* The title is a real <a>: middle-click and copy-link work; a
						    plain click is the Link's, so the row handler must not refire. */}
						<Link
							to="/runs/$runId"
							params={{ runId: a.ref }}
							search={(prev: Record<string, unknown>) => prev}
							className="title sys-ellipsis sys-rowlink"
							onClick={(e: React.MouseEvent) => e.stopPropagation()}
						>
							{a.title}
						</Link>
						<span className="sys-chip mono">{a.where}</span>
						<span className="when">{fmtTime(a.at)}</span>
						<span className="go">open ›</span>
					</li>
				))}
			</ul>
		</div>
	);
}
