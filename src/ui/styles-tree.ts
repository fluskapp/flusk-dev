/**
 * The project tool window: an IntelliJ tree — one 22px line per row, a twisty,
 * and badges that only appear when they mean something. Nothing animates
 * except a live run.
 */
export const TREE_CSS = `
#tree { padding-bottom: 20px; }
.tree-row {
	display: flex; align-items: center; gap: 6px; height: var(--row);
	padding: 0 8px 0 6px; cursor: pointer;
	border-left: 2px solid transparent; white-space: nowrap;
}
.tree-row:hover { background: var(--hover); }
.tree-row.active { background: var(--sel); border-left-color: var(--accent); }
.tree-row.active:hover { background: var(--sel); }
.tree-row.cursor { outline: 1px solid var(--accent); outline-offset: -1px; }
.tree-row.child { padding-left: 28px; color: var(--text); }
.twisty { width: 12px; flex: none; text-align: center; color: var(--dim); font-size: 9px; }
.node-name { overflow: hidden; text-overflow: ellipsis; }
.node-name.dim-path { font: 11px var(--font-code); color: var(--dim); }

.kind-chip {
	font: 10px var(--font-code); text-transform: uppercase; letter-spacing: .3px;
	color: var(--dim); border: 1px solid var(--border); padding: 0 4px;
}
.kind-chip.harness { color: var(--accent); border-color: var(--accent); }

.tree-row .count { margin-left: auto; color: var(--dim); font: 11px var(--font-code); }
.badge-live {
	margin-left: auto; font: 600 10.5px var(--font-code); color: var(--on-accent);
	background: var(--accent); padding: 0 5px;
	animation: ah-pulse 1.6s ease-in-out infinite;
}
.badge-attn {
	font: 600 10.5px var(--font-code); color: var(--on-accent);
	background: var(--err); padding: 0 5px;
}
.badge-live + .badge-attn { margin-left: 6px; }
@keyframes ah-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .badge-live { animation: none; } }
`;
