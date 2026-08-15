/**
 * The run control strip: start a fake run, steer or stop a live one. Compact
 * enough for a view header. Keyboard-first: Enter fires the input's action,
 * Escape clears the nearest field or disarms the stop confirm. Stop confirms
 * in place (armed second press) — no native dialog stealing focus.
 */
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { abortRun, startRun, steerRun, type StartedRun } from "../../../features/run/run.functions.js";
import { ErrorBanner } from "./ErrorBanner.js";
import { LiveBadge } from "./LiveBadge.js";
import type { RunStream } from "./live-stream.js";
import { useServerCall } from "./use-server-call.js";
import "./live.css";

const ARM_MS = 3000; // an armed Stop that is forgotten must disarm itself

export function RunControls({
	runId = null,
	stream = null,
	onStarted,
}: {
	runId?: string | null;
	/** Pass the store's stream to get the badge without a second SSE socket. */
	stream?: RunStream | null;
	onStarted?: (run: StartedRun) => void;
}) {
	const [task, setTask] = useState("");
	const [steer, setSteer] = useState("");
	const [refused, setRefused] = useState<string | null>(null);
	const [armed, setArmed] = useState(false);
	const disarm = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	const start = useServerCall(startRun as (a: { data: { task: string } }) => Promise<StartedRun>);
	const send = useServerCall(steerRun as (a: { data: { runId: string; text: string } }) => Promise<{ ok: boolean }>);
	const stop = useServerCall(abortRun as (a: { data: { runId: string } }) => Promise<{ ok: boolean }>);
	useEffect(() => () => clearTimeout(disarm.current), []);

	const doStart = async () => {
		if (task.trim() === "") return;
		const run = await start.call({ data: { task: task.trim() } });
		if (run !== null) {
			setTask("");
			onStarted?.(run);
		}
	};
	const doSteer = async () => {
		if (runId === null || steer.trim() === "") return;
		const r = await send.call({ data: { runId, text: steer.trim() } });
		if (r !== null && !r.ok) setRefused("Run is not steerable — it may have just ended.");
		else if (r !== null) setSteer("");
	};
	const doStop = async () => {
		if (runId === null) return;
		if (!armed) {
			setArmed(true);
			disarm.current = setTimeout(() => setArmed(false), ARM_MS);
			return;
		}
		clearTimeout(disarm.current);
		setArmed(false);
		const r = await stop.call({ data: { runId } });
		if (r !== null && !r.ok) setRefused("Run already gone — nothing to stop.");
	};
	const key =
		(act: () => void, clear: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") act();
			else if (e.key === "Escape") clear();
		};

	return (
		<div className="live-strip">
			<div className="live-row">
				<input
					className="live-input"
					placeholder="Task for a new run"
					spellCheck={false}
					value={task}
					onChange={(e) => setTask(e.target.value)}
					onKeyDown={key(() => void doStart(), () => setTask(""))}
				/>
				<button type="button" className="live-btn primary" disabled={start.loading || task.trim() === ""} onClick={() => void doStart()}>
					{start.loading ? "Starting…" : "Start"}
				</button>
				<button type="button" className="live-btn" disabled title="Real runs need provider API keys — configure them, then flusk doctor">
					Start real
				</button>
			</div>
			{runId !== null ? (
				<div className="live-row">
					{stream !== null ? <LiveBadge stream={stream} /> : null}
					<input
						className="live-input"
						placeholder="Steer the run"
						spellCheck={false}
						value={steer}
						onChange={(e) => setSteer(e.target.value)}
						onKeyDown={key(() => void doSteer(), () => setSteer(""))}
					/>
					<button type="button" className="live-btn" disabled={send.loading || steer.trim() === ""} onClick={() => void doSteer()}>
						Steer
					</button>
					<button
						type="button"
						className={`live-btn danger${armed ? " armed" : ""}`}
						disabled={stop.loading}
						onClick={() => void doStop()}
						onKeyDown={(e) => {
							if (e.key === "Escape" && armed) setArmed(false);
						}}
						onBlur={() => setArmed(false)}
					>
						{armed ? "Stop run?" : "Stop"}
					</button>
				</div>
			) : null}
			<ErrorBanner message={start.error} onRetry={start.retry} onClose={start.clear} />
			<ErrorBanner message={send.error} onRetry={send.retry} onClose={send.clear} />
			<ErrorBanner message={stop.error} onRetry={stop.retry} onClose={stop.clear} />
			<ErrorBanner message={refused} onClose={() => setRefused(null)} />
		</div>
	);
}
