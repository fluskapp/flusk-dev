/**
 * React face of live-stream.ts: subscribe a component to one run's events.
 * Passing null renders the idle shape, so a view can call the hook
 * unconditionally and only pay for a connection when it has a run.
 */
import { useEffect, useState } from "react";
import { openRunStream, type RunStream } from "./live-stream.js";

export type { RunStream } from "./live-stream.js";

const IDLE: RunStream = { events: [], skipped: 0, turns: 0, last: null, status: "connecting" };

export function useRunEvents(runId: string | null): RunStream {
	const [stream, setStream] = useState<RunStream>(IDLE);
	useEffect(() => {
		if (runId === null) {
			setStream(IDLE);
			return;
		}
		setStream(IDLE); // a new run must not inherit the old run's tail
		return openRunStream(runId, setStream);
	}, [runId]);
	return stream;
}
