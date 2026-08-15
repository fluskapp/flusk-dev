/**
 * The symbol-aware code viewer: source with a line gutter, a structure strip,
 * and an identifier under every click. The highlighted HTML is an opaque
 * island (dangerouslySetInnerHTML of server output + codePositions), so the
 * selection classes are managed on the DOM directly — React never re-renders
 * inside it, which is exactly why that is safe.
 *
 * A click is a POSITION, not a word: the span already knows where it is. The
 * lookup itself belongs to the documentation window, which listens for the
 * "flusk:symbol" DOM event this dispatches.
 */
import { useCallback, useEffect, useMemo, useRef } from "react";
import "./code.css";
import type { OutlineReply, SourceReply } from "../../../features/projects/files.functions.js";
import { CODE_MAX_COL, CODE_MAX_IDS, codePositions } from "./code-positions.js";
import { CodeOutline } from "./CodeOutline.js";
import { EdBar } from "./ed-bar.js";

type Src = Extract<SourceReply, { ok: true }>;

interface Props {
	source: Src;
	outline: OutlineReply | null;
	/** 1-based; 0 means "at the top". Find in Files and ?line= both land here. */
	line: number;
	/** ?sym= targeting: land on the named declaration when no line is given. */
	sym?: string;
}

export function CodeViewer({ source, outline, line, sym }: Props) {
	const pos = useMemo(() => codePositions(source.html), [source.html]);
	const lineCount = useMemo(() => String(source.text).split("\n").length, [source.text]);
	const wrapRef = useRef<HTMLDivElement>(null);

	/** Open at a line: gutter row marked, band placed from the row's own offset
	 * rather than a copy of the line height — one number in CSS, nothing to
	 * drift out of step. */
	const goto = useCallback((l: number) => {
		const host = wrapRef.current;
		if (host === null) return;
		host.querySelectorAll(".code-gutter .gl.on").forEach((g) => g.classList.remove("on"));
		const mark = host.querySelector<HTMLElement>(".code-mark");
		if (mark !== null) mark.hidden = true;
		if (l <= 0) return;
		const gl = host.querySelector<HTMLElement>(`.code-gutter .gl[data-gl="${l}"]`);
		if (gl === null) return;
		gl.classList.add("on");
		if (mark !== null) {
			mark.style.top = `${gl.offsetTop}px`;
			mark.hidden = false;
			// Restart the landing flash: same node, new jump. Without the reflow
			// between the two writes the animation never re-fires.
			mark.style.animation = "none";
			void mark.offsetHeight;
			mark.style.animation = "";
		}
		gl.scrollIntoView({ block: "center" });
	}, []);

	// ?line= wins; ?sym= falls back to the outline's declaration line.
	const symLine = sym !== undefined ? (outline?.items.find((i) => i.name === sym)?.line ?? 0) : 0;
	const target = line > 0 ? line : symLine;

	useEffect(() => {
		goto(target);
		if (sym === undefined) return;
		// Mark the named identifier too, so the eye lands on the symbol itself.
		const spans = wrapRef.current?.querySelectorAll<HTMLElement>(".code-body .idn") ?? [];
		for (const s of spans) {
			if (s.textContent === sym && (target === 0 || Number(s.dataset.line) >= target)) {
				s.classList.add("on");
				break;
			}
		}
	}, [target, sym, goto, pos.html]);

	const onBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const el = (e.target as HTMLElement).closest?.("[data-line][data-col]");
		if (el === null || el === undefined) return;
		wrapRef.current
			?.querySelectorAll(".code-body .idn.on")
			.forEach((s) => s.classList.remove("on"));
		el.classList.add("on");
		document.dispatchEvent(
			new CustomEvent("flusk:symbol", {
				detail: {
					file: source.path,
					sym: el.textContent ?? "",
					line: Number(el.getAttribute("data-line")),
				},
			}),
		);
	};

	return (
		<>
			<EdBar path={source.path} line={line} />
			{pos.capped ? (
				<div className="code-note">
					This file is past the click-target budget ({CODE_MAX_IDS} identifiers, {CODE_MAX_COL}{" "}
					columns a line); the rest is shown read-only.
				</div>
			) : null}
			<div className="code-wrap" ref={wrapRef}>
				<aside className="code-outline">
					<div className="co-head">Structure</div>
					<CodeOutline reply={outline} onGoto={goto} />
				</aside>
				<div className="code-view">
					<div className="code-gutter">
						{Array.from({ length: lineCount }, (_, i) => (
							<div key={i + 1} className="gl" data-gl={i + 1}>
								{i + 1}
							</div>
						))}
					</div>
					<div className="code-body" onClick={onBodyClick}>
						<div className="code-mark" hidden />
						<pre className="code" dangerouslySetInnerHTML={{ __html: pos.html }} />
					</div>
				</div>
			</div>
		</>
	);
}
