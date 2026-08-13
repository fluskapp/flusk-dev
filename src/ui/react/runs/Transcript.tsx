/**
 * Transcript rendering for the run view — client-detail.ts as components:
 * the meta strip, turn-shaped items with tool calls as collapsible nodes,
 * and the stats line ("session in progress…" until a stats entry exists).
 */
import type {
	SessionRun,
	ToolView,
	TranscriptItem,
} from "../../../features/projects/runs.functions.js";
import { base, fmtCost, fmtTime } from "./format.js";
import { Pill } from "./widgets.js";
import "./transcript.css";

export function Meta({ d, actions }: { d: SessionRun; actions: React.ReactNode }) {
	const h = d.header;
	return (
		<div id="meta">
			<span className="meta-item">
				<Pill status={d.status} />
			</span>
			<span className="meta-item">
				<b>{base(h.repoRoot)}</b>
				{h.gitBranch ? (
					<>
						{" "}
						<span className="dim">on</span> {h.gitBranch}
					</>
				) : null}
			</span>
			<span className="meta-item dim">{`${h.model.provider}/${h.model.id}`}</span>
			<span className="meta-item dim">#{h.id}</span>
			<span className="meta-item dim">{fmtTime(h.createdAt)}</span>
			<span className="meta-actions">{actions}</span>
		</div>
	);
}

function Tool({ t }: { t: ToolView }) {
	let preview = "";
	try {
		preview = JSON.stringify(t.args) ?? "";
	} catch {
		preview = "";
	}
	if (preview.length > 90) preview = `${preview.slice(0, 90)}…`;
	return (
		<details className={`tool${t.isError ? " err" : ""}`}>
			<summary>
				<span className="tool-chip">{t.name}</span>
				<span className="tool-preview">{preview}</span>
				{t.isError ? <span className="tool-flag">failed</span> : null}
			</summary>
			<pre className="code">{JSON.stringify(t.args, null, 2)}</pre>
			{t.output !== null ? (
				<pre className="code out">{t.output}</pre>
			) : (
				<div className="dim small pad">no result recorded</div>
			)}
		</details>
	);
}

function Item({ it }: { it: TranscriptItem }) {
	if (it.kind === "user") {
		return (
			<div className="msg user">
				<div className="msg-tag">user</div>
				<div className="msg-body pre">{it.text}</div>
			</div>
		);
	}
	if (it.kind === "compaction") {
		return <div className="compaction">context compacted — {it.summary.slice(0, 120)}</div>;
	}
	return (
		<div className="msg assistant">
			<div className="msg-tag">flusk</div>
			<div className="msg-body">
				{it.text ? <div className="pre">{it.text}</div> : null}
				{it.tools.map((t) => (
					<Tool key={t.id} t={t} />
				))}
				{it.errorMessage !== undefined ? (
					<div className="error-line">⚠ {it.errorMessage}</div>
				) : null}
			</div>
		</div>
	);
}

function Stats({ s }: { s: SessionRun["stats"] }) {
	if (s === null) return <div className="running-note">session in progress…</div>;
	return (
		<div className="stats">
			{s.turns} turns · {fmtCost(s.usage.costUsd)} · {s.usage.input} in / {s.usage.output} out
			tokens
		</div>
	);
}

export function Transcript({ d }: { d: SessionRun }) {
	return (
		<div id="transcript">
			{d.items.map((it, i) => (
				// Transcript items are append-only, so the index is a stable key.
				<Item key={i} it={it} />
			))}
			<Stats s={d.stats} />
		</div>
	);
}
