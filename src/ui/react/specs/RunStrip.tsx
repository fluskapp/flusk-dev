/**
 * Intent → run. The mode chip names how the run routes (spec.types'
 * MODE_KIND); Run (fake) drives the scripted offline provider, Run (real)
 * the CLI's full machinery against this repo. The task IS the spec —
 * title, a blank line, the body verbatim — and a started run is offered
 * as a /runs/$runId link (URI-encoded id), never an automatic navigation
 * away from the intent it serves.
 */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { startReal, startRun, type StartedRun } from "../../../features/run/run.functions.js";
import { MODE_KIND, type Spec } from "../../../features/specs/spec.types.js";
import { ErrorBanner } from "../live/ErrorBanner.js";
import { useServerCall } from "../live/use-server-call.js";
import { composeTask } from "./spec-rows.js";
import "../live/live.css";
import "./specs.css";

type Patch = Record<string, unknown>;

export function RunStrip({ spec, repo }: { spec: Spec; repo: string }) {
	const [started, setStarted] = useState<StartedRun | null>(null);
	const fake = useServerCall(startRun as (a: { data: { task: string } }) => Promise<StartedRun>);
	const real = useServerCall(
		startReal as (a: { data: { task: string; repoRoot: string; kind: string } }) => Promise<StartedRun>,
	);
	const task = composeTask(spec);
	const kind = MODE_KIND[spec.mode];
	const doFake = async () => {
		const r = await fake.call({ data: { task } });
		if (r !== null) setStarted(r);
	};
	const doReal = async () => {
		const r = await real.call({ data: { task, repoRoot: repo, kind } });
		if (r !== null) setStarted(r);
	};
	return (
		<div className="live-strip spec-run">
			<div className="live-row">
				<span className="spec-mode">{spec.mode}</span>
				<span className="dim">runs as a {kind} run · the task is the spec</span>
				<button
					type="button"
					className="live-btn primary"
					disabled={fake.loading}
					title="Offline, against the scripted fake provider"
					onClick={() => void doFake()}
				>
					{fake.loading ? "Starting…" : "Run (fake)"}
				</button>
				<button
					type="button"
					className="live-btn"
					disabled={real.loading}
					title="The CLI's full machinery — needs provider keys; flusk doctor says whether you have them"
					onClick={() => void doReal()}
				>
					{real.loading ? "Starting…" : "Run (real)"}
				</button>
			</div>
			{started !== null ? (
				<div className="live-row">
					<span className="dim">started</span>
					<Link
						className="ev"
						to="/runs/$runId"
						params={{ runId: encodeURIComponent(started.runId) }}
						search={(prev: Patch) => prev}
					>
						{started.runId}
					</Link>
				</div>
			) : null}
			<ErrorBanner message={fake.error} onRetry={fake.retry} onClose={fake.clear} />
			<ErrorBanner message={real.error} onRetry={real.retry} onClose={real.clear} />
		</div>
	);
}
