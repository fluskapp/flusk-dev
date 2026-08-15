/**
 * The live-run store: ONE getLiveRuns fetch on mount (no polling — the runs
 * that exist then are subscribed by SSE, and runs this client starts arrive
 * through track()). Streams live in refs and publish through a tick so a
 * hundred events cost one render, not one render per Map clone.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { getLiveRuns, type StartedRun } from "../../../features/run/run.functions.js";
import { openRunStream, type RunStream } from "./live-stream.js";

export interface LiveRuns {
	liveRuns: StartedRun[];
	eventsFor(runId: string): RunStream | null;
	/** Adopt a run this client just started, without a refetch. */
	track(run: StartedRun): void;
	loading: boolean;
	error: string | null;
	retry(): void;
}

export function useLiveRuns(): LiveRuns {
	const [runs, setRuns] = useState<StartedRun[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [, setTick] = useState(0);
	const streams = useRef(new Map<string, RunStream>());
	const closers = useRef(new Map<string, () => void>());
	const alive = useRef(true);

	const watch = useCallback((run: StartedRun) => {
		if (closers.current.has(run.runId)) return;
		closers.current.set(
			run.runId,
			openRunStream(run.runId, (s) => {
				streams.current.set(run.runId, s);
				setTick((t) => t + 1);
			}),
		);
	}, []);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const list = (await getLiveRuns()) as StartedRun[];
			if (!alive.current) return;
			setRuns(list);
			for (const r of list) watch(r);
		} catch (e) {
			if (alive.current) setError(e instanceof Error ? e.message : String(e));
		} finally {
			if (alive.current) setLoading(false);
		}
	}, [watch]);

	useEffect(() => {
		alive.current = true;
		void load();
		const owned = closers.current;
		return () => {
			alive.current = false;
			for (const off of owned.values()) off();
			owned.clear();
		};
	}, [load]);

	const track = useCallback(
		(run: StartedRun) => {
			setRuns((rs) => (rs.some((r) => r.runId === run.runId) ? rs : [...rs, run]));
			watch(run);
		},
		[watch],
	);

	return {
		liveRuns: runs,
		eventsFor: (runId) => streams.current.get(runId) ?? null,
		track,
		loading,
		error,
		retry: () => void load(),
	};
}
