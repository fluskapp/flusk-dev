/**
 * React face of live-stream.ts: subscribe a component to one run's events.
 * Passing null renders the idle shape, so a view can call the hook
 * unconditionally and only pay for a connection when it has a run.
 *
 * The tail size is a preference (ui.liveTailEvents): fetched once per page
 * and cached module-wide, and a fetch failure falls back to the stream's own
 * default rather than costing the subscription.
 */
import { useEffect, useState } from "react";
import { getUiPrefs, type UiPrefs } from "../../../features/workbench/workbench.functions.js";
import { openRunStream, type RunStream } from "./live-stream.js";

export type { RunStream } from "./live-stream.js";

const IDLE: RunStream = { events: [], skipped: 0, turns: 0, costUsd: 0, last: null, status: "connecting" };

let cachedPrefs: Promise<UiPrefs> | null = null;
const uiPrefs = (): Promise<UiPrefs> =>
	(cachedPrefs ??= (getUiPrefs() as Promise<UiPrefs>).catch(() => {
		cachedPrefs = null; // a transient failure must not pin the fallback forever
		return { liveTailEvents: 400, defaultRunConfig: null };
	}));

export function useRunEvents(runId: string | null): RunStream {
	const [stream, setStream] = useState<RunStream>(IDLE);
	useEffect(() => {
		if (runId === null) {
			setStream(IDLE);
			return;
		}
		setStream(IDLE); // a new run must not inherit the old run's tail
		let close: (() => void) | null = null;
		let cancelled = false;
		void uiPrefs().then((p) => {
			if (cancelled) return;
			close = openRunStream(runId, setStream, p.liveTailEvents);
		});
		return () => {
			cancelled = true;
			close?.();
		};
	}, [runId]);
	return stream;
}
