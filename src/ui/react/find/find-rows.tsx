/**
 * The Find in Files result TREE: one row per file with its match count, each
 * expanding into its matching lines. The rows are flattened into one indexed
 * list because that list is what the cursor and Enter both address; the tree
 * is presentation. JSX replaces the legacy string templates, so `ranges` are
 * sliced out of the RAW text and rendered as nodes — markup can only ever
 * come from this file.
 */
import type { ReactNode } from "react";
import type { FindFile, FindMatch, FindResult } from "../../../features/search/search.functions.js";
import { base, dirOf, fileGlyph } from "../files/path-bits.js";

export type FindRow =
	| { kind: "file"; file: FindFile; pos: number; size: number }
	| { kind: "line"; file: FindFile; m: FindMatch; pos: number; size: number };

/** Files are expanded by default; `open` only ever records a collapse. */
export const fxOpen = (open: Record<string, boolean>, path: string): boolean =>
	open[path] !== false;

/** The visible rows in order — what the cursor indexes. `pos`/`size` are a
 * row's place among its SIBLINGS, which is what a treeitem has to state. */
export function buildRows(result: FindResult | null, open: Record<string, boolean>): FindRow[] {
	const rows: FindRow[] = [];
	const files = result?.files ?? [];
	files.forEach((f, fi) => {
		rows.push({ kind: "file", file: f, pos: fi + 1, size: files.length });
		if (!fxOpen(open, f.path)) return;
		f.matches.forEach((m, mi) => {
			rows.push({ kind: "line", file: f, m, pos: mi + 1, size: f.matches.length });
		});
	});
	return rows;
}

/** A matched line with its hit spans wrapped — offsets clamped, never trusted. */
export function FxMark({ text, ranges }: { text: string; ranges: [number, number][] }) {
	const t = String(text ?? "");
	const out: ReactNode[] = [];
	let at = 0;
	(ranges ?? []).forEach(([s0, e0], i) => {
		const s = Math.max(at, Math.min(t.length, s0 | 0));
		const e = Math.max(s, Math.min(t.length, e0 | 0));
		if (e === s) return;
		out.push(t.slice(at, s));
		out.push(
			<span className="hit" key={i}>
				{t.slice(s, e)}
			</span>,
		);
		at = e;
	});
	out.push(t.slice(at));
	return <>{out}</>;
}

interface RowProps {
	r: FindRow;
	i: number;
	on: boolean;
	open: Record<string, boolean>;
	onPick: (i: number) => void;
}

/**
 * A file node. It is a real tree row for assistive tech too: the twisty's
 * state is `aria-expanded`, not only a glyph, and it has an id so the query
 * field can point aria-activedescendant at it — which is how the cursor is
 * announced, since focus stays in the field.
 */
export function FxRow({ r, i, on, open, onPick }: RowProps) {
	const shared = {
		role: "treeitem",
		id: `fx-${i}`,
		"aria-posinset": r.pos,
		"aria-setsize": r.size,
		"aria-selected": on,
		"data-fx": i,
		onClick: () => onPick(i),
	} as const;
	if (r.kind === "file") {
		const f = r.file;
		const isOpen = fxOpen(open, f.path);
		return (
			<div
				className={`fx-file${on ? " on" : ""}`}
				aria-level={1}
				aria-expanded={isOpen}
				title={f.path}
				{...shared}
			>
				<span className="twisty">{isOpen ? "▾" : "▸"}</span>
				<span className="glyph">{fileGlyph(f.path)}</span>
				<span className="fx-name">{base(f.path)}</span>
				<span className="fx-dir">{(f.project ? `${f.project}  ` : "") + dirOf(f.path)}</span>
				<span className="fx-count">{f.matches.length}</span>
			</div>
		);
	}
	return (
		<div
			className={`fx-line${on ? " on" : ""}`}
			aria-level={2}
			title={`${r.file.path}:${r.m.line}`}
			{...shared}
		>
			<span className="gutter">{r.m.line}</span>
			<span className="fx-text">
				<FxMark text={r.m.text} ranges={r.m.ranges} />
			</span>
		</div>
	);
}
