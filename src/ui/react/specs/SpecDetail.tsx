/**
 * One spec, whole: the harness's half (status, mode, acceptance) as a
 * stepper and chips, the author's half verbatim, and the run strip that
 * turns the intent into a run. Saving a status invalidates the route, so
 * the file on disk stays the only truth the window ever shows.
 */
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { saveSpecStatus, type SpecWriteReply } from "../../../features/specs/specs.functions.js";
import type { Spec, SpecStatus } from "../../../features/specs/spec.types.js";
import { ErrorBanner } from "../live/ErrorBanner.js";
import { useServerCall } from "../live/use-server-call.js";
import { fmtTime } from "../runs/format.js";
import { Sec } from "../runs/widgets.js";
import { RunStrip } from "./RunStrip.js";
import { STATUS_ORDER } from "./spec-rows.js";
import "../runs/table.css";
import "../runs/widgets.css";
import "./specs.css";

type Patch = Record<string, unknown>;

export function SpecDetail({ spec, repo }: { spec: Spec; repo: string }) {
	const navigate = useNavigate();
	const router = useRouter();
	const [refused, setRefused] = useState<string | null>(null);
	const save = useServerCall(
		saveSpecStatus as (a: { data: { repo: string; name: string; status: SpecStatus } }) => Promise<SpecWriteReply>,
	);
	const setStatus = async (status: SpecStatus) => {
		if (status === spec.status) return;
		const r = await save.call({ data: { repo, name: spec.name, status } });
		if (r === null) return;
		if (!r.ok) {
			setRefused(r.why);
			return;
		}
		setRefused(null);
		void router.invalidate();
	};
	return (
		<>
			<div className="head-row">
				<h2>{spec.title}</h2>
				<span className="dim">
					{spec.path} · {fmtTime(spec.updatedAt)}
				</span>
				<div className="meta-actions">
					<span
						className="ev"
						onClick={() => navigate({ to: "/specs", search: (prev: Patch) => ({ ...prev, spec: undefined }) })}
					>
						all specs
					</span>
				</div>
			</div>
			{/* The lifecycle as buttons: the current status is a fact — pressed
			 * and inert — every other step is one click of intent. */}
			<div className="spec-stepper" role="group" aria-label="Status">
				{STATUS_ORDER.map((s) => (
					<button
						key={s}
						type="button"
						className={`act spec-step${s === spec.status ? " on" : ""}`}
						aria-pressed={s === spec.status}
						disabled={save.loading}
						onClick={() => void setStatus(s)}
					>
						{s}
					</button>
				))}
			</div>
			<ErrorBanner message={save.error} onRetry={save.retry} onClose={save.clear} />
			<ErrorBanner message={refused} onClose={() => setRefused(null)} />
			<RunStrip spec={spec} repo={repo} />
			{spec.acceptance.length > 0 ? (
				<Sec title="Acceptance" count={spec.acceptance.length}>
					<ul className="spec-accept">
						{spec.acceptance.map((a) => (
							<li key={a}>{a}</li>
						))}
					</ul>
				</Sec>
			) : null}
			<Sec title="Spec">
				<pre className="spec-body">{spec.body}</pre>
			</Sec>
		</>
	);
}
