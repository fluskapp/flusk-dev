/**
 * The fallback file view: the lines Find matched, plus a straight answer
 * about why the rest is not here. flusk serves whole bodies only for what it
 * indexes, and inventing a body for anything else would be the one thing a
 * file viewer must never do.
 */
import { useEffect, type ReactNode } from "react";
import type { FindFile } from "../../../features/search/search.functions.js";
import { FxMark } from "../find/find-rows.js";
import { matchesFor } from "../find/find-store.js";
import { EdBar } from "./ed-bar.js";

/**
 * The matching lines, in the editor's gutter, the opened one marked. An
 * elided range carries the same empty gutter cell as a real line, so the
 * gutter is one unbroken column down the peek instead of stopping at gaps.
 */
export function PeekRows({ file, line }: { file: FindFile; line: number }) {
	let prev = 0;
	const out: ReactNode[] = [];
	file.matches.forEach((m, i) => {
		if (prev !== 0 && m.line > prev + 1) {
			out.push(
				<div className="peek-gap" key={`gap-${i}`}>
					<span className="gutter" />
					<span className="text">⋮</span>
				</div>,
			);
		}
		prev = m.line;
		out.push(
			<div key={i} className={`peek-row${m.line === line ? " hit-line" : ""}`} data-line={m.line}>
				<span className="gutter">{m.line}</span>
				<span className="text">
					<FxMark text={m.text} ranges={m.ranges} />
				</span>
			</div>,
		);
	});
	return <div className="peek">{out}</div>;
}

/** Above a rendered body: where the hit is, without hiding the document. */
export function PeekBlock({ path, line }: { path: string; line: number }) {
	const file = line > 0 ? matchesFor(path) : null;
	if (file === null) return null;
	return (
		<div className="peek-wrap">
			<div className="dim small">
				{file.matches.length} match{file.matches.length === 1 ? "" : "es"} here · line {line}
			</div>
			<PeekRows file={file} line={line} />
		</div>
	);
}

/** Scroll the opened line's peek row to the middle, once it exists. */
export function useMarkLine(deps: unknown[]): void {
	useEffect(() => {
		document.querySelector("#file .hit-line")?.scrollIntoView({ block: "center" });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- caller-owned deps
	}, deps);
}

/** Everything else: the lines Find found, and an honest note about the rest. */
export function FilePeek({ path, line }: { path: string; line: number }) {
	const file = matchesFor(path);
	useMarkLine([path, line, file]);
	return (
		<>
			<EdBar path={path} line={line} />
			{file !== null ? (
				<div className="peek-wrap">
					<PeekRows file={file} line={line} />
				</div>
			) : (
				<div className="empty small">
					flusk serves whole file bodies for the documents and journals it indexes.
					<br />
					Search this file (⌘⇧F) to read its matching lines here, or copy the nvim command above.
				</div>
			)}
		</>
	);
}
