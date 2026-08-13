/**
 * The markdown surface every .md tab is built from (client-md.ts): a toolbar
 * carrying the IntelliJ SegmentedButton [Preview | Split | Raw], and a body
 * in whichever of those the tab was last left in (localStorage, per tab).
 * `html` is server-rendered — never built here: escaping is the renderer's
 * security invariant, and a second implementation would be a second place to
 * get it wrong.
 */
import { useEffect, useState } from "react";
import { MD_LABEL, MD_MODES, type MdMode, mdMode, setMdMode } from "./md-mode.js";
import "./md.css";

export interface MdSurfaceProps {
	/** The localStorage identity of this tab, e.g. "doc:<path>", "run:<path>". */
	id: string;
	title?: string;
	path: string;
	html: string;
	text: string;
	/** Belongs above the body in every mode: the run view's stage pipeline. */
	head?: React.ReactNode;
	actions?: React.ReactNode;
}

export function MdSurface({ id, title, path, html, text, head, actions }: MdSurfaceProps) {
	const hasRaw = text !== "";
	// SSR renders the default; the remembered mode lands after hydration.
	const [mode, setMode] = useState<MdMode>("preview");
	useEffect(() => setMode(mdMode(id)), [id]);

	const pick = (m: MdMode) => {
		setMdMode(id, m);
		setMode(m);
	};
	// p / s / R only mean anything on a markdown tab; elsewhere they fall through.
	useEffect(() => {
		const MD_KEYS: Record<string, MdMode> = { p: "preview", s: "split", R: "raw" };
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const m = MD_KEYS[e.key];
			if (m === undefined || (m !== "preview" && !hasRaw)) return;
			e.preventDefault();
			pick(m);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	const shown: MdMode = hasRaw ? mode : "preview";
	const raw = <pre className="raw code">{text}</pre>;
	// eslint-disable-next-line react/no-danger -- server-rendered, escaped there
	const md = <div className="md" dangerouslySetInnerHTML={{ __html: html }} />;
	return (
		<>
			<div className="ed-bar">
				{title !== undefined ? <b>{title}</b> : null}
				<span className="path">{path}</span>
				<div className="seg" role="group" aria-label="Preview mode">
					{MD_MODES.map((m) => {
						const off = m !== "preview" && !hasRaw;
						return (
							<button
								key={m}
								type="button"
								data-md={m}
								aria-pressed={m === shown}
								className={m === shown ? "on" : undefined}
								disabled={off}
								title={off ? "the server serves this document already rendered" : undefined}
								onClick={() => pick(m)}
							>
								{MD_LABEL[m]}
							</button>
						);
					})}
				</div>
				<div className="meta-actions">{actions}</div>
			</div>
			{head}
			{shown === "raw" ? (
				<div className="ed-body">{raw}</div>
			) : shown === "split" ? (
				<div className="ed-body split">
					{raw}
					{md}
				</div>
			) : (
				<div className="ed-body">{md}</div>
			)}
		</>
	);
}
