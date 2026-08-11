/**
 * The project tool window: an IntelliJ tree — one line per row, a twisty,
 * and badges that only appear when they mean something. Nothing animates
 * except a live run.
 */
export const TREE_CSS = `
#tree { padding-bottom: 24px; }
.tree-row {
	display: flex; align-items: center; gap: 6px;
	padding: 2px 10px 2px 8px; cursor: pointer; line-height: 20px;
	border-left: 2px solid transparent; white-space: nowrap;
}
.tree-row:hover { background: var(--hover); }
.tree-row.active { background: var(--sel); border-left-color: var(--accent); }
.tree-row.cursor { outline: 1px solid var(--accent); outline-offset: -1px; }
.tree-row.child { padding-left: 30px; font-size: 12.5px; color: var(--text); }
.twisty {
	width: 12px; flex: none; text-align: center; color: var(--dim); font-size: 9px;
}
.node-name { overflow: hidden; text-overflow: ellipsis; }
.node-name.dim-path { font: 11px var(--font-code); color: var(--dim); }

.kind-chip {
	font: 10px var(--font-code); text-transform: uppercase; letter-spacing: .3px;
	color: var(--dim); border: 1px solid var(--border); border-radius: 3px; padding: 0 4px;
}
.kind-chip.harness { color: var(--accent); border-color: var(--accent); }

.tree-row .count {
	margin-left: auto; color: var(--dim); font-size: 11px;
	background: var(--hover); border-radius: 8px; padding: 0 6px;
}
.badge-live {
	margin-left: auto; font: 600 10.5px var(--font-code); color: var(--on-accent);
	background: var(--accent); border-radius: 8px; padding: 0 6px;
	animation: ah-pulse 1.6s ease-in-out infinite;
}
.badge-attn {
	font: 600 10.5px var(--font-code); color: var(--on-accent);
	background: var(--err); border-radius: 8px; padding: 0 6px;
}
.badge-live + .badge-attn { margin-left: 6px; }
@keyframes ah-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .badge-live { animation: none; } }
`;
