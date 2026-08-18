/**
 * A live run, tailed over its SSE stream (/api/events/$runId) — the Run tool
 * window a running configuration opens, not a journal that does not exist
 * yet. The tail folds assistant deltas into one growing paragraph; tool and
 * turn frames stay one line each. When the id names no live run (the server
 * restarted, the run ended before the link was followed), the view says so
 * honestly and points at the feed.
 */
import { Link } from "@tanstack/react-router";
import type { FluskEvent } from "../../../platform/events/events.js";
import { LiveBadge } from "../live/LiveBadge.js";
import { useRunEvents } from "../live/use-run-events.js";
import "../live/live.css";

export interface TailLine {
	cls: "say" | "note" | "tool";
	text: string;
	/** An assistant paragraph still growing — the next delta appends here. */
	open?: boolean;
}

/** Fold the event tail into printable lines; deltas merge, frames don't. */
export function foldTail(events: ReadonlyArray<FluskEvent>): TailLine[] {
	const out: TailLine[] = [];
	for (const e of events) {
		if (e.type === "assistant:delta") {
			if (e.channel !== "text") continue;
			const last = out[out.length - 1];
			if (last?.open === true) last.text += e.text;
			else out.push({ cls: "say", text: e.text, open: true });
			continue;
		}
		if (out.length > 0) (out[out.length - 1] as TailLine).open = false;
		if (e.type === "turn:start") out.push({ cls: "note", text: `— turn ${e.turn} —` });
		else if (e.type === "tool:start") out.push({ cls: "tool", text: `▸ ${e.name}` });
		else if (e.type === "tool:end")
			out.push({ cls: "tool", text: `${e.isError ? "✕" : "✓"} ${e.name}` });
		else if (e.type === "run:end") out.push({ cls: "note", text: `run ended — ${e.reason}` });
	}
	return out;
}

/** The honest note for an id the server no longer knows. */
export function LiveGone({ runId }: { runId: string }) {
	return (
		<div className="sys-empty">
			<span>
				Run {runId} is no longer live — its session appears in the feed when the harness
				records one.
			</span>
			<Link to="/runs">Open Runs</Link>
		</div>
	);
}

export function LiveRun({ runId, task }: { runId: string; task: string }) {
	const stream = useRunEvents(runId);
	const lines = foldTail(stream.events);
	return (
		<>
			<div className="head-row">
				<h2 className="sys-ellipsis" title={task}>
					{task.split("\n", 1)[0]}
				</h2>
				<LiveBadge stream={stream} />
			</div>
			<div className="live-tail">
				{stream.skipped > 0 ? (
					<div className="tail-note">…skipped {stream.skipped} events</div>
				) : null}
				{lines.length === 0 ? (
					<div className="tail-note">waiting for events…</div>
				) : (
					lines.map((l, i) => (
						// The tail is append-only (deltas mutate the last line in place),
						// so the index is a stable key.
						<div key={i} className={`tail-${l.cls}`}>
							{l.text}
						</div>
					))
				)}
			</div>
		</>
	);
}
