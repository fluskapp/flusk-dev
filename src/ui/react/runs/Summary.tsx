/**
 * The Summary block of a run page (experience.md: "outcome, gate verdicts,
 * files touched, cost — harness-observed, never model-authored"): the one
 * assembled sentence, then the dense stat chips behind each clause. Fetched
 * client-side so the route loader stays untouched; a ref with no session
 * behind it (a journal, a live fake) renders nothing rather than a shell.
 */
import { useEffect, useState } from "react";
import { getRunSummary, type RunSummary } from "../../../features/projects/runs.functions.js";
import { useServerCall } from "../live/use-server-call.js";
import { fmtCost } from "./format.js";
import { Pill } from "./widgets.js";
import "./summary.css";

function Chip({ label, value }: { label: string; value: string }) {
	return (
		<span className="rs-chip">
			<span className="rs-k">{label}</span>
			<span className="rs-v">{value}</span>
		</span>
	);
}

export function SummaryBar({ keyRef }: { keyRef: string }) {
	const [summary, setSummary] = useState<RunSummary | null>(null);
	const { call } = useServerCall(getRunSummary);
	useEffect(() => {
		void call({ data: { ref: keyRef } }).then(setSummary);
	}, [call, keyRef]);
	if (summary === null) return null;
	const s = summary;
	return (
		<div className="run-summary">
			<p className="rs-conclusion">{s.conclusion}</p>
			<div className="rs-chips">
				{/* The outcome pill reuses the feed's status colours: completed
				    is --ok, error is --err — one mapping across both views. */}
				{s.outcome !== null ? <Pill status={s.outcome} /> : null}
				{s.turns !== null ? <Chip label="turns" value={String(s.turns)} /> : null}
				{s.costUsd !== null ? <Chip label="cost" value={fmtCost(s.costUsd)} /> : null}
				<Chip label="files" value={String(s.filesTouched.length)} />
				<Chip label="commands" value={String(s.commandsRun.length)} />
				<Chip label="verified" value={String(s.verified.length)} />
				{s.reportCheck !== null ? <Chip label="report" value={s.reportCheck} /> : null}
			</div>
		</div>
	);
}
