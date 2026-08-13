/**
 * A harness journal, rendered (client-journal.ts). The stage pipeline, its
 * failing-stage evidence and the PR link stay above the body; the body is
 * the markdown the harness wrote, RENDERED by default.
 */
import { useRef, useState } from "react";
import type { Journal, JournalBody } from "../../../features/projects/runs.functions.js";
import { prNumber, safeUrl } from "../docs/frontmatter.js";
import { MdSurface } from "../docs/MdSurface.js";
import { base, fmtTime } from "./format.js";
import { PathActions } from "./run-actions.js";
import { StageChip, StageErrors } from "./stages.js";
import { Pill, useToast } from "./widgets.js";
import "./table.css";
import "./transcript.css";

/**
 * Scroll the rendered journal to the first block that names this stage.
 * Scoped to `.md`: the unscoped selector's `pre` matched the single
 * `<pre class="raw code">` Raw and Split render, so the "jump" marked the
 * WHOLE document. In Raw mode there are no blocks to land on, so the raw
 * pane is scrolled by the line's proportion instead.
 */
function jumpToStage(host: HTMLElement, name: string): boolean {
	const needle = name.toLowerCase();
	for (const el of host.querySelectorAll(".hit-line")) el.classList.remove("hit-line");
	const els = host.querySelectorAll(".md h1, .md h2, .md h3, .md p, .md li, .md td, .md pre");
	for (const el of els) {
		if (!String(el.textContent).toLowerCase().includes(needle)) continue;
		el.classList.add("hit-line");
		el.scrollIntoView({ block: "center" });
		return true;
	}
	return jumpRawToStage(host, needle);
}

/** Raw mode has one <pre>: scroll it to where the stage is named in the text. */
function jumpRawToStage(host: HTMLElement, needle: string): boolean {
	const raw = host.querySelector<HTMLElement>(".ed-body pre.raw");
	if (raw === null) return false;
	const text = String(raw.textContent);
	const at = text.toLowerCase().indexOf(needle);
	if (at === -1) return false;
	const before = text.slice(0, at).split("\n").length - 1;
	const total = Math.max(1, text.split("\n").length);
	raw.scrollTop = Math.max(0, (before / total) * raw.scrollHeight - raw.clientHeight / 2);
	return true;
}

function JournalHead({
	meta,
	path,
	pick,
}: {
	meta: Journal | null;
	path: string;
	pick: { selected: string | null; onPick: (name: string) => void };
}) {
	if (meta === null) {
		return (
			<div className="head-row">
				<h2>{base(path)}</h2>
			</div>
		);
	}
	const pr = safeUrl(meta.pr);
	return (
		<>
			<div className="head-row">
				<h2>{meta.title.replace(/^Run:\s*/, "")}</h2>
				<Pill status={meta.status} />
				<span className="dim">
					{meta.harness} · {fmtTime(meta.date)}
				</span>
			</div>
			<div className="stages">
				{meta.stages.map((s) => (
					<StageChip key={s.name} s={s} pick={pick} />
				))}
			</div>
			<StageErrors stages={meta.stages} pick={pick} />
			{/* A button, not the URL: "Open PR #188" is the action; the href was
			    only ever something to copy into a browser by hand. */}
			{pr !== null ? (
				<div className="meta-actions">
					<a className="act" href={pr} target="_blank" rel="noopener noreferrer">
						Open PR{prNumber(pr)}
					</a>
				</div>
			) : null}
		</>
	);
}

export function JournalRun({
	meta,
	path,
	body,
}: {
	meta: Journal | null;
	path: string;
	body: JournalBody;
}) {
	const host = useRef<HTMLDivElement>(null);
	const [toastNode, toast] = useToast();
	// One stage is selected at a time. The mark outlives :focus on purpose:
	// the click moves focus into the document, and IntelliJ keeps showing the
	// row it came from in the INACTIVE selection colour.
	const [selected, setSelected] = useState<string | null>(null);
	const onPick = (name: string) => {
		setSelected(name);
		if (host.current !== null && !jumpToStage(host.current, name)) {
			toast(`“${name}” is not named in this journal`);
		}
	};
	const html =
		body.html !== ""
			? body.html
			: '<div class="empty small">could not render this journal</div>';
	return (
		<div ref={host}>
			<MdSurface
				id={`run:${path}`}
				path={path}
				html={html}
				text={body.text}
				head={<JournalHead meta={meta} path={path} pick={{ selected, onPick }} />}
				actions={<PathActions path={path} toast={toast} />}
			/>
			{toastNode}
		</div>
	);
}
