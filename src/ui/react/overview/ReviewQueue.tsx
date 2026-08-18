/**
 * The review queue: finished runs that still need a human, verdict-first —
 * the pill answers "how carefully must I read this", the row's one primary
 * action is Open, Park is the explicit dismissal. localStorage stays in this
 * file; every decision lives in review-queue.ts.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { RunRow } from "../../../features/projects/runs.functions.js";
import { fmtCost, fmtTime } from "../runs/format.js";
import { Line, Sec, VerdictPill } from "../runs/widgets.js";
import {
	isParked,
	PARK_KEY,
	type ParkMap,
	parkEntry,
	parseParkMap,
	type ReviewGroup,
	reviewGroups,
	reviewQueue,
} from "./review-queue.js";
import "./review-queue.css";

const readPark = (): ParkMap => {
	try {
		return parseParkMap(localStorage.getItem(PARK_KEY));
	} catch {
		return {}; // SSR / private mode: an empty map, never a crash
	}
};

export function ReviewQueue({ rows }: { rows: RunRow[] | null }) {
	const navigate = useNavigate();
	/* The server snapshot is the empty map; the real one loads after hydration.
	 * Reading localStorage during render would make the first client render
	 * disagree with the SSR HTML — a one-frame flash beats a hydration error. */
	const [park, setPark] = useState<ParkMap>({});
	useEffect(() => {
		setPark(readPark());
	}, []);
	if (rows === null) {
		return (
			<Sec title="Needs review">
				<Line>
					<span className="dim">run feed unavailable — the queue cannot be derived</span>
				</Line>
			</Sec>
		);
	}
	const queue = reviewQueue(rows, park);
	// Parked GROUPS, not rows: "5 parked" for one five-retry task would imply
	// five separate decisions were made.
	const hidden = reviewGroups(rows).filter((g) => isParked(g, park)).length;
	// The RAW ref: the router does the one URI encoding — pre-encoding here
	// double-encoded every href (%252F) and broke tab titles downstream.
	const open = (ref: string) =>
		void navigate({
			to: "/runs/$runId",
			params: { runId: ref },
			search: (prev: Record<string, unknown>) => prev,
		});
	const doPark = (r: ReviewGroup) => {
		const next = parkEntry(park, r);
		setPark(next);
		try {
			localStorage.setItem(PARK_KEY, JSON.stringify(next));
		} catch {
			/* private mode: parked for this render only (client-md.ts:25 precedent) */
		}
	};
	return (
		<Sec title="Needs review" count={queue.length}>
			{queue.length === 0 ? (
				<Line>
					<span className="dim">
						{hidden > 0 ? `all clear — ${hidden} parked` : "all clear — nothing needs review"}
					</span>
				</Line>
			) : (
				<ul className="rq">
					{queue.map((r) => (
						<li
							key={`${r.ref}:${r.at}`}
							className="sys-card rq-row"
							title={r.ref}
							// biome-ignore lint/a11y/noNoninteractiveTabindex: the row is the keyboard surface (RunsView precedent)
							tabIndex={0}
							onClick={() => open(r.ref)}
							onKeyDown={(e) => {
								/* Enter opens the ROW only — a focused Park button keeps its own Enter. */
								if (e.key === "Enter" && e.target === e.currentTarget) {
									e.preventDefault();
									open(r.ref);
								}
							}}
						>
							<VerdictPill verdict={r.verdict} status={r.status} />
							{/* A real <a>: middle-click and copy-link work; a plain click
							    is the Link's, so the row handler must not refire it. */}
							<Link
								to="/runs/$runId"
								params={{ runId: r.ref }}
								search={(prev: Record<string, unknown>) => prev}
								className="title sys-ellipsis sys-rowlink"
								onClick={(e: React.MouseEvent) => e.stopPropagation()}
							>
								{r.title}
							</Link>
							<span className="sys-chip mono">{r.project}</span>
							{r.attempts > 1 ? (
								<span
									className="sys-chip"
									title="Retries of this task, stacked; the newest is shown"
								>
									×{r.attempts} attempts
								</span>
							) : null}
							{/* An unknown metric is OMITTED: "— files" reads as broken data. */}
							<span className="rq-meta">
								{[
									r.filesTouched === undefined ? null : `${r.filesTouched} files`,
									r.costUsd === undefined ? null : fmtCost(r.costUsd),
									fmtTime(r.at),
								]
									.filter((part) => part !== null)
									.join(" · ")}
							</span>
							<span className="rq-actions">
								<button type="button" className="sys-btn" onClick={() => open(r.ref)}>
									Open
								</button>
								<button
									type="button"
									className="sys-btn bare"
									title="Hide this task — every stacked attempt — until it produces new activity"
									onClick={(e) => {
										e.stopPropagation();
										doPark(r);
									}}
								>
									Park
								</button>
							</span>
						</li>
					))}
				</ul>
			)}
		</Sec>
	);
}
