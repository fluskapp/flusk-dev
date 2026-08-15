/**
 * One transcript item (client-detail.ts's itemHtml as components). A tool
 * call is a console tree node: one dense summary row — twisty, name, first
 * line of the args, an output-size or FAILED badge — expanding in place.
 * Thinking ships collapsed and dim: it is deliberation, not the log.
 */
import type { ToolView, TranscriptItem } from "../../../features/projects/runs.functions.js";

/** First line of the packed args, capped so the summary row never wraps. */
function argsPreview(args: unknown): string {
	let s = "";
	try {
		s = JSON.stringify(args) ?? "";
	} catch {
		s = "";
	}
	const nl = s.indexOf("\n");
	if (nl !== -1) s = s.slice(0, nl);
	return s.length > 90 ? `${s.slice(0, 90)}…` : s;
}

/** Escape collapses the node it happened in and hands focus back to its row. */
function closeOnEscape(e: React.KeyboardEvent<HTMLDetailsElement>) {
	if (e.key !== "Escape" || !e.currentTarget.open) return;
	e.stopPropagation();
	e.currentTarget.open = false;
	e.currentTarget.querySelector("summary")?.focus();
}

function Tool({ t }: { t: ToolView }) {
	const lines = t.output === null ? 0 : t.output.split("\n").length;
	return (
		<details className={`tool${t.isError ? " err" : ""}`} onKeyDown={closeOnEscape}>
			<summary>
				<span className="tool-chip">{t.name}</span>
				<span className="tool-preview">{argsPreview(t.args)}</span>
				{/* The session file records no durations, so the trailing badge is
				    what it CAN prove: failure, or how much output came back. */}
				{t.isError ? (
					<span className="tool-flag">failed</span>
				) : lines > 0 ? (
					<span className="tool-len">
						{lines} line{lines === 1 ? "" : "s"}
					</span>
				) : null}
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

function Thinking({ text }: { text: string }) {
	const first = text.split("\n", 1)[0] ?? "";
	return (
		<details className="tool think" onKeyDown={closeOnEscape}>
			<summary>
				<span className="tool-chip">thinking</span>
				<span className="tool-preview">{first}</span>
			</summary>
			<div className="pre think-body">{text}</div>
		</details>
	);
}

export function Item({ it }: { it: TranscriptItem }) {
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
				{it.thinking !== "" ? <Thinking text={it.thinking} /> : null}
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
