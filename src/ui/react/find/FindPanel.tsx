/**
 * The Find in Files panel body — the query line and the result tree — shared
 * by the bottom strip (#find) and the /find page (#findview). Focus stays in
 * the query field throughout; the field points aria-activedescendant at the
 * selected row, which is how the cursor is announced.
 */
import { useEffect, useRef } from "react";
import "./find.css";
import { useFindController, type FindInit } from "./find-controller.js";
import { FxRow } from "./find-rows.js";
import type { FindControls } from "./find-store.js";

export interface FindPanelState extends FindControls {
	q: string;
}

interface Props {
	project: string;
	initial?: FindInit;
	autoFocus?: boolean;
	onClose?: () => void;
	/** Fires on every control/query change — the page mirrors it into the URL. */
	onState?: (s: FindPanelState) => void;
	onOpenFile: (path: string, line: number, project: string) => void;
}

export function FindPanel({ project, initial, autoFocus, onClose, onState, onOpenFile }: Props) {
	const f = useFindController(project, onOpenFile, initial);
	const qRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Opening always takes the caret, as IntelliJ does — otherwise the first
	// thing typed lands in whatever field had focus before.
	useEffect(() => {
		if (autoFocus === true) {
			qRef.current?.focus();
			qRef.current?.select();
		}
	}, [autoFocus]);

	useEffect(() => {
		listRef.current?.querySelectorAll("[data-fx]")[f.cursor]?.scrollIntoView({ block: "nearest" });
	}, [f.cursor]);

	useEffect(() => {
		onState?.({ q: f.q, ...f.controls });
		// eslint-disable-next-line react-hooks/exhaustive-deps -- onState identity is the caller's business
	}, [f.q, f.controls]);

	const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "ArrowDown") { e.preventDefault(); f.move(1); }
		else if (e.key === "ArrowUp") { e.preventDefault(); f.move(-1); }
		else if (e.key === "Enter") { e.preventDefault(); f.enter(); }
		else if (e.key === "Escape") {
			// Stop here: Escape in the find box means "close find", not "also
			// clear the project filter behind it".
			e.preventDefault();
			e.stopPropagation();
			onClose?.();
		}
	};

	return (
		<>
			<div id="find-form">
				<input
					id="find-q"
					ref={qRef}
					spellCheck={false}
					placeholder="Search across your projects (ripgrep)"
					aria-controls="find-results"
					aria-activedescendant={f.cursor >= 0 ? `fx-${f.cursor}` : undefined}
					value={f.q}
					onChange={(e) => f.setQ(e.target.value)}
					onKeyDown={onKey}
				/>
				<select
					id="find-scope"
					title="Where to search"
					value={f.controls.scope}
					onChange={(e) => f.setControl({ scope: e.target.value === "all" ? "all" : "project" })}
				>
					<option value="project">This project</option>
					<option value="all">All projects</option>
				</select>
				<input
					id="find-mask"
					spellCheck={false}
					placeholder="File mask *.ts"
					title="ripgrep glob"
					value={f.controls.mask}
					onChange={(e) => f.setControl({ mask: e.target.value.trim() })}
				/>
				<label className="find-toggle" title="Match case">
					<input type="checkbox" id="find-case" checked={f.controls.cs}
						onChange={(e) => f.setControl({ cs: e.target.checked })} />
					<span>Match case</span>
				</label>
				<label className="find-toggle" title="Regular expression">
					<input type="checkbox" id="find-regex" checked={f.controls.re}
						onChange={(e) => f.setControl({ re: e.target.checked })} />
					<span>Regex</span>
				</label>
				<span id="find-note" className={f.note.warn ? "warn" : undefined}>{f.note.text}</span>
			</div>
			<div id="find-results" role="tree" aria-label="Find results" ref={listRef}>
				{f.result === null ? (
					<div className="fx-empty" role="presentation">Type to search every configured project.</div>
				) : f.rows.length === 0 ? (
					<div className="fx-empty" role="presentation">
						No matches for “{f.q}”
						{f.result.note !== undefined ? <span className="dim"> — {f.result.note}</span> : null}
					</div>
				) : (
					f.rows.map((r, i) => (
						<FxRow key={i} r={r} i={i} on={i === f.cursor} open={f.open} onPick={f.pick} />
					))
				)}
			</div>
		</>
	);
}
