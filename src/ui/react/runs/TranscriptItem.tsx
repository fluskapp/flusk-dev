/**
 * One transcript item (client-detail.ts's itemHtml as components). A tool
 * call is a console tree node: one dense summary row — twisty, name, first
 * line of the args, an output-size or FAILED badge — expanding in place.
 * Thinking ships collapsed and dim: it is deliberation, not the log.
 */
import type { ToolView, TranscriptItem } from "../../../features/projects/runs.functions.js";
import { fmtCost } from "./format.js";
import { Ic } from "../system/Icon.js";
import { TOOL_ICON } from "../system/icons.js";

/**
 * What a collapsed tool row says: the THING, not its JSON. A write/edit/read
 * leads with its file path, bash with the command, grep/glob with the
 * pattern — raw serialized args are what the expansion is for.
 */
function argsPreview(name: string, args: unknown): { path?: string; text: string } {
	const a = (typeof args === "object" && args !== null ? args : {}) as Record<string, unknown>;
	const str = (k: string) => (typeof a[k] === "string" ? (a[k] as string) : undefined);
	const path = str("file_path");
	if (path !== undefined) return { path, text: "" };
	const lead = str("command") ?? str("pattern") ?? str("query") ?? str("task");
	if (lead !== undefined) {
		const one = lead.split("\n", 1)[0] ?? "";
		return { text: one.length > 80 ? `${one.slice(0, 80)}…` : one };
	}
	let s = "";
	try {
		s = JSON.stringify(args) ?? "";
	} catch {
		s = "";
	}
	return { text: s.length > 80 ? `${s.slice(0, 80)}…` : s };
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
	const preview = argsPreview(t.name, t.args);
	return (
		<details className={`tool${t.isError ? " err" : ""}`} onKeyDown={closeOnEscape}>
			<summary>
				<Ic name={TOOL_ICON[t.name] ?? "file"} size={14} />
				<span className="tool-chip">{t.name}</span>
				{preview.path !== undefined ? (
					<span className="tool-path sys-chip mono">{preview.path}</span>
				) : (
					<span className="tool-preview">{preview.text}</span>
				)}
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
				<Ic name="think" size={14} />
				<span className="tool-chip">thinking</span>
				<span className="tool-preview">{first}</span>
			</summary>
			<div className="pre think-body">{text}</div>
		</details>
	);
}

export function Item({ it, cum }: { it: TranscriptItem; cum?: number }) {
	if (it.kind === "user") {
		// A long task (a whole spec) folds to its first lines; the card keeps
		// the reader oriented without owning the viewport.
		const lines = it.text.split("\n");
		const long = lines.length > 14;
		const body = <div className="msg-body pre">{it.text}</div>;
		return (
			<div className="msg user">
				<div className="msg-tag">
					<Ic name="user" size={14} />
				</div>
				{long ? (
					<details className="user-fold">
						<summary>
							<span className="sys-ellipsis">{lines[0]}</span>
							<span className="dim"> — {lines.length} lines</span>
						</summary>
						{body}
					</details>
				) : (
					body
				)}
			</div>
		);
	}
	if (it.kind === "compaction") {
		return <div className="compaction">context compacted — {it.summary.slice(0, 120)}</div>;
	}
	return (
		<div className="msg assistant">
			<div className="msg-tag">
				<Ic name="bot" size={14} />
			</div>
			<div className="msg-body">
				{it.thinking !== "" ? <Thinking text={it.thinking} /> : null}
				{it.text ? <div className="pre">{it.text}</div> : null}
				{it.tools.map((t) => (
					<Tool key={t.id} t={t} />
				))}
				{it.errorMessage !== undefined ? (
					<div className="error-line">⚠ {it.errorMessage}</div>
				) : null}
				{it.usage !== undefined && cum !== undefined ? (
					<div className="dim small">
						{fmtCost(it.usage.costUsd)} · {fmtCost(cum)} total
					</div>
				) : null}
			</div>
		</div>
	);
}
