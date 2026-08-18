/**
 * The command palette and the shortcut sheet, rendered nothing until
 * summoned: ⌘K opens History, ⌘⇧O opens Go to File, ? opens Help. The
 * keydown listener is in the CAPTURE phase so it runs before the workbench's
 * own keys and can swallow the ones it acts on — otherwise Escape here would
 * also clear the project filter behind it.
 */
import { useEffect, useRef, useState } from "react";
import "./palette.css";
import { CommandRows } from "../runconfig/palette-commands.js";
import { HelpSheet } from "./HelpSheet.js";
import { usePaletteActions } from "./palette-actions.js";
import { FilesList, HistoryList } from "./palette-rows.js";
import { CardView, PromptView } from "./palette-prompt.js";
import { usePalette } from "./palette-state.js";

const typing = (e: KeyboardEvent): boolean => {
	const t = e.target as HTMLElement | null;
	return t !== null && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
};

export function PaletteAndHelp() {
	const p = usePalette();
	const a = usePaletteActions(p);
	const [help, setHelpState] = useState(false);
	const helpRef = useRef(false);
	const setHelp = (v: boolean) => {
		helpRef.current = v;
		setHelpState(v);
	};
	const qRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
			const mod = e.metaKey || e.ctrlKey;
			const key = e.key.toLowerCase();
			if (helpRef.current) {
				if (e.key === "Escape" || e.key === "?") { stop(); setHelp(false); }
				return;
			}
			if (!p.ref.current.open) {
				if (mod && !e.shiftKey && key === "k") { stop(); p.openPal(); }
				else if (mod && e.shiftKey && key === "o") { stop(); p.openPal("files"); }
				else if (e.key === "?" && !typing(e)) { stop(); setHelp(true); }
				return;
			}
			const st = p.ref.current;
			if (e.key === "Escape") { stop(); a.escape(); }
			else if (e.key === "Tab") { stop(); p.setMode(st.mode === "files" ? "history" : "files"); }
			else if (e.key === "Enter") { stop(); a.enter(mod); }
			else if (mod && key === "p") { stop(); a.toggleAll(); }
			else if (
				st.prompt === null && st.card === null &&
				(e.key === "ArrowDown" || e.key === "ArrowUp" || (mod && (key === "j" || key === "k")))
			) {
				stop();
				a.move(e.key === "ArrowDown" || key === "j" ? 1 : -1);
			}
		};
		document.addEventListener("keydown", onKey, true);
		// No dep array: re-bound each render, so the handlers never go stale
		// (the project scope, in particular, follows navigation).
		return () => document.removeEventListener("keydown", onKey, true);
	});

	// Opening takes the caret; the cursor row stays scrolled into view.
	useEffect(() => {
		if (p.s.open) { qRef.current?.focus(); qRef.current?.select(); }
	}, [p.s.open, p.s.mode]);
	useEffect(() => {
		listRef.current?.querySelector(".pal-row.on")?.scrollIntoView({ block: "nearest" });
	}, [p.s.cur]);

	if (help) return <HelpSheet onClose={() => setHelp(false)} />;
	if (!p.s.open) return null;
	const st = p.s;
	return (
		<div id="palette" className="overlay" onClick={(e) => { if (e.target === e.currentTarget) a.close(); }}>
			<div className="pal-card">
				<div className="pal-modes">
					<button data-pal="history" className={st.mode === "history" ? "on" : undefined}
						onClick={() => p.setMode("history")}>History</button>
					<button data-pal="files" className={st.mode === "files" ? "on" : undefined}
						onClick={() => p.setMode("files")}>Files (⌘⇧O)</button>
				</div>
				<input
					id="pal-q"
					ref={qRef}
					spellCheck={false}
					placeholder={st.mode === "files"
						? "Go to file — fuzzy path across your projects"
						: "Search history — commits, sessions, journals, docs, skills"}
					value={st.q}
					onChange={(e) => p.type(e.target.value)}
				/>
				<div id="pal-list" ref={listRef}>
					{st.card !== null ? (
						<CardView h={st.card} />
					) : st.prompt !== null ? (
						<PromptView prompt={st.prompt} off={st.off} onToggle={a.toggleBlock} />
					) : st.mode === "files" ? (
						<FilesList hits={st.files} q={st.q.replace(/^\//, "").trim()} cur={st.cur} onPick={a.pick} />
					) : (
						<>
							<CommandRows q={st.q} onClose={a.close} />
							<HistoryList hits={st.hits} q={st.q.trim()} cur={st.cur} onPick={a.pick} />
						</>
					)}
				</div>
				<div className="pal-foot">
					<span id="pal-note" className="dim small">{st.note}</span>
					<span className="spacer" />
					<button id="pal-compose" className="act" title="Compose a prompt (⌘⏎)" onClick={a.compose}>
						Compose prompt
					</button>
				</div>
			</div>
		</div>
	);
}
