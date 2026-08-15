/**
 * The one-glance state of a live run: status dot, turn count, last event
 * type — and, honestly, how many events the ring dropped before we read
 * them. Views that already hold a RunStream (the store) render <LiveBadge
 * stream={…}>; a view with only a runId mounts <LiveBadgeFor> and the badge
 * owns its own subscription.
 */
import type { RunStream } from "./live-stream.js";
import { useRunEvents } from "./use-run-events.js";
import "./live.css";

const STATUS_WORD: Record<RunStream["status"], string> = {
	connecting: "connecting",
	open: "live",
	ended: "done",
	lost: "reconnecting",
};

export function LiveBadge({ stream }: { stream: RunStream }) {
	return (
		<span className={`live-badge is-${stream.status}`} title={STATUS_WORD[stream.status]}>
			<span className="live-dot" aria-hidden="true" />
			<span className="live-turn">turn {stream.turns}</span>
			{stream.last !== null ? <span className="live-last">{stream.last}</span> : null}
			{stream.skipped > 0 ? (
				<span className="live-skip">…skipped {stream.skipped} events</span>
			) : null}
		</span>
	);
}

/** Badge that owns its subscription — for views with only a runId in hand. */
export function LiveBadgeFor({ runId }: { runId: string }) {
	return <LiveBadge stream={useRunEvents(runId)} />;
}
