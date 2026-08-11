/**
 * The project tool window: an IntelliJ tree — one Tree.rowHeight line per row,
 * a twisty, and badges that only appear when they mean something. Nothing
 * animates except a live run.
 *
 * Every value is a token. A child row is indented to exactly where its parent's
 * label starts (the row inset plus the twisty plus its gap), so the two columns
 * of text line up instead of nearly lining up.
 */
export const TREE_CSS = `
#tree { padding-bottom: var(--ij-space-4); }
.tree-row {
	display: flex; align-items: center; gap: var(--ij-space-2); height: var(--row);
	padding: 0 var(--ij-space-2) 0 var(--ij-space); cursor: pointer;
	border-left: var(--ij-space-1) solid transparent; white-space: nowrap;
}
.tree-row:hover { background: var(--hover); }
/* The selected project, in the same two colours every other list uses: the
   focused fill while the keyboard is in the tree, *.selectionInactiveBackground
   while it is in the view. \`zone-view\` on <body> is what says which (see
   markZone in client-cursor.ts), and both rules outrank :hover above. */
.tree-row.active, .tree-row.active:hover {
	background: var(--ij-selection-inactive); border-left-color: var(--accent);
}
body:not(.zone-view) .tree-row.active, body:not(.zone-view) .tree-row.active:hover {
	background: var(--sel);
}
.tree-row.cursor {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
	outline-offset: calc(var(--ij-focus-ring-w) * -1);
}
.tree-row.child {
	padding-left: calc(var(--ij-space-4) + var(--ij-space-2)); color: var(--text);
}
.twisty {
	width: var(--ij-space-3); flex: none; text-align: center;
	color: var(--dim); font-size: var(--ij-fs-1);
}
.node-name { overflow: hidden; text-overflow: ellipsis; }
.node-name.dim-path { font: var(--ij-fs-3) var(--font-code); color: var(--dim); }

.kind-chip {
	font: var(--ij-fs-1) var(--font-code); text-transform: uppercase; letter-spacing: .3px;
	color: var(--dim); border: 1px solid var(--border); padding: 0 var(--ij-space);
}
.kind-chip.harness { color: var(--accent); border-color: var(--accent); }

.tree-row .count {
	margin-left: auto; color: var(--dim); font: var(--ij-fs-3) var(--font-code);
}
/* Filled with Button.default's Blue, so it takes that button's own white
   foreground; --on-accent is the Badge pair, which is dark on dark's Blue6. */
.badge-live {
	margin-left: auto; font: 600 var(--ij-fs-2) var(--font-code);
	color: var(--ij-button-default-fg);
	background: var(--accent); padding: 0 var(--ij-space);
	animation: ah-pulse 1.6s ease-in-out infinite;
}
.badge-attn {
	font: 600 var(--ij-fs-2) var(--font-code); color: var(--on-accent);
	background: var(--err); padding: 0 var(--ij-space);
}
.badge-live + .badge-attn { margin-left: var(--ij-space-2); }
@keyframes ah-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
@media (prefers-reduced-motion: reduce) { .badge-live { animation: none; } }
`;
