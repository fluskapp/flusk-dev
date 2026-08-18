/**
 * One live run's SSE subscription over /api/events/$runId, framework-free so
 * both the per-run hook and the multi-run store share it.
 *
 * The server confesses ring-buffer overflow as `event: dropped` frames; we
 * accumulate them as `skipped` so a view can say "…skipped N events" instead
 * of silently lying about completeness. EventSource retries CONNECTING drops
 * on its own; a hard CLOSED (e.g. the stream ended mid-run) gets our own
 * timer, and a seen `run:end` means the silence is legitimate — no retry.
 */
import type { FluskEvent } from "../../../platform/events/events.js";

export interface RunStream {
	/** The tail of the run, oldest first, bounded by KEEP. */
	events: FluskEvent[];
	/** Events that aged out of the server ring before we read them. */
	skipped: number;
	/** Highest turn number seen. */
	turns: number;
	/** Dollars accumulated from turn:end frames (deduped by turn on replay). */
	costUsd: number;
	last: FluskEvent["type"] | null;
	status: "connecting" | "open" | "ended" | "lost";
}

/** Enough tail for a badge or strip; assistant deltas age out first. */
const KEEP = 400;
const RETRY_MS = 2000;

export function openRunStream(
	runId: string,
	onChange: (s: RunStream) => void,
	/** Tail ring size; ui.liveTailEvents where a view carries the preference. */
	keep = KEEP,
): () => void {
	let events: FluskEvent[] = [];
	let skipped = 0;
	let turns = 0;
	let costUsd = 0;
	let costTurn = 0;
	let last: FluskEvent["type"] | null = null;
	let status: RunStream["status"] = "connecting";
	let es: EventSource | null = null;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let closed = false;

	const publish = () => onChange({ events, skipped, turns, costUsd, last, status });

	const connect = () => {
		es = new EventSource(`/api/events/${encodeURIComponent(runId)}`);
		es.onopen = () => {
			status = "open";
			publish();
		};
		es.onmessage = (m: MessageEvent<string>) => {
			let e: FluskEvent;
			try {
				e = JSON.parse(m.data) as FluskEvent;
			} catch {
				return; // a torn frame is the server's bug, not a reason to die
			}
			events = events.length >= keep ? [...events.slice(1 - keep), e] : [...events, e];
			if (e.type === "turn:start" && e.turn > turns) turns = e.turn;
			if (e.type === "turn:end" && e.turn > costTurn) {
				costTurn = e.turn;
				costUsd += e.message.usage.costUsd;
			}
			last = e.type;
			if (e.type === "run:end") {
				status = "ended";
				es?.close(); // beat the auto-reconnect to the 404
			}
			publish();
		};
		es.addEventListener("dropped", (m) => {
			skipped += Number((m as MessageEvent<string>).data) || 0;
			publish();
		});
		es.onerror = () => {
			if (closed || status === "ended") return;
			if (es?.readyState === EventSource.CLOSED) {
				status = "lost";
				publish();
				timer = setTimeout(connect, RETRY_MS);
			}
			// CONNECTING: the browser is already retrying for us.
		};
	};
	connect();
	publish();

	return () => {
		closed = true;
		if (timer !== undefined) clearTimeout(timer);
		es?.close();
	};
}
