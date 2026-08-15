/**
 * One tree row, as client-tree.ts drew it: twisty, name, kind chip, the
 * worktree label that says which project this is a checkout of, and badges
 * that only appear when they mean something. The twisty is one glyph that
 * ROTATES on expand — swapping characters made the toggle flicker.
 */
import { Hi } from "../kit/speed-search.js";
import type { VisRow } from "./tree-model.js";

export interface RowActions {
	open: (row: VisRow) => void;
	toggle: (name: string) => void;
}

export function TreeRowView({
	row,
	at,
	cursor,
	active,
	q,
	act,
}: {
	row: VisRow;
	at: number;
	cursor: number;
	active: string | null;
	q: string;
	act: RowActions;
}) {
	const cur = at === cursor ? " cursor" : "";
	if (row.kind === "child") {
		return (
			<div
				className={`tree-row child${cur}`}
				role="treeitem"
				data-at={at}
				onClick={() => act.open(row)}
			>
				<span className="twisty" />
				<span className="node-name">{row.label}</span>
				{row.count === null ? null : <span className="count">{row.count}</span>}
			</div>
		);
	}
	const p = row.p;
	return (
		<>
			{row.sepBefore !== null ? <div className="tree-sep">{row.sepBefore} quiet</div> : null}
			<div
				className={`tree-row${active === p.name ? " active" : ""}${cur}`}
				role="treeitem"
				aria-expanded={row.open}
				data-at={at}
				title={p.path}
				onClick={() => act.open(row)}
			>
				<span
					className={`twisty${row.open ? " open" : ""}`}
					onClick={(e) => {
						e.stopPropagation();
						act.toggle(p.name);
					}}
				>
					▸
				</span>
				<span className="node-name">
					<Hi text={p.name} q={q} />
				</span>
				<span className={`kind-chip ${p.kind}`}>{p.kind}</span>
				{p.worktreeOf !== undefined ? (
					<span className="wt-chip" title={`a git worktree of ${p.worktreeOf}`}>
						⤷ {p.worktreeOf}
					</span>
				) : null}
				{p.liveRuns > 0 ? (
					<span className="badge-live">{p.liveRuns} live</span>
				) : (
					<span className="count">{p.runs}</span>
				)}
				{p.attention.length > 0 ? (
					<span className="badge-attn" title="needs attention">
						{p.attention.length}
					</span>
				) : null}
			</div>
		</>
	);
}
