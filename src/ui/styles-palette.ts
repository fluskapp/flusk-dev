/**
 * The command palette: IntelliJ's "Search Everywhere" — a card floating near
 * the top of the window, one dense row per hit, groups separated by a label
 * rather than a box, and a mode strip because the same card answers both
 * "what happened here" (history) and "where is that file" (Go to File).
 *
 * Every value is a token. The card is a Popup, so it carries the popup's frame
 * (Component.borderColor) rather than the hairline used inside a panel, and a
 * hit row is a list row: Tree.rowHeight tall, *.selectionBackground when it is
 * the one the keyboard is on.
 */
export const PALETTE_CSS = `
#palette { align-items: flex-start; padding-top: 10vh; }
.pal-card {
	display: flex; flex-direction: column; width: min(760px, 92vw); /* design-exempt: popup measure */
	max-height: 74vh;
	background: var(--panel); border: 1px solid var(--ij-border-control); overflow: hidden;
}
.pal-modes { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
.pal-modes button {
	font-size: var(--ij-fs-4); padding: var(--ij-space-1) var(--ij-space-3);
	border-radius: 0; color: var(--dim); border-right: 1px solid var(--border);
}
.pal-modes button.on {
	background: var(--sel); color: var(--text);
	box-shadow: inset 0 calc(var(--ij-space-1) * -1) 0 var(--accent);
}
#pal-q {
	padding: var(--ij-space-2) var(--ij-space-3);
	font: var(--ij-fs-7) var(--font-ui); color: var(--text);
	background: var(--panel); border: none; border-bottom: 1px solid var(--border);
	outline: none;
}
#pal-q::placeholder { color: var(--dim); }
#pal-list { overflow-y: auto; padding: var(--ij-space-1) 0; }
.pal-group {
	padding: var(--ij-space) var(--ij-space-3) var(--ij-space-1);
	font-size: var(--ij-fs-3); letter-spacing: .5px;
	text-transform: uppercase; color: var(--dim);
}
.pal-row {
	display: flex; gap: var(--ij-space-2); align-items: center;
	padding: 0 var(--ij-space-3); cursor: pointer;
	white-space: nowrap; height: var(--row);
	border-left: var(--ij-space-1) solid transparent;
}
.pal-row:hover { background: var(--hover); }
.pal-row.on { background: var(--sel); border-left-color: var(--accent); }
.pal-title { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pal-path {
	font: var(--ij-fs-5) var(--font-code);
	overflow: hidden; text-overflow: ellipsis; flex: 1;
}
.pal-path .dir { color: var(--dim); }
.pal-meta { color: var(--dim); font-size: var(--ij-fs-4); flex: none; }
.pal-row mark { background: var(--match-bg); color: var(--match-fg); }
.pal-empty { padding: var(--ij-space-3); color: var(--dim); }
.pal-foot {
	display: flex; gap: var(--ij-space-2); align-items: center;
	padding: var(--ij-space) var(--ij-space-2);
	border-top: 1px solid var(--border); background: var(--bg);
}
.pal-block {
	padding: var(--ij-space) var(--ij-space-3); border-bottom: 1px solid var(--border);
}
.pal-block label {
	display: flex; gap: var(--ij-space-2); align-items: baseline; cursor: pointer;
}
.pal-block .why { color: var(--dim); font-size: var(--ij-fs-4); }
/* Indented past the checkbox so the reason sits under its own label. */
.pal-block pre {
	margin: var(--ij-space) 0 0 calc(var(--ij-space-4) + var(--ij-space-2));
	max-height: calc(var(--ij-row-h) * 4.5); overflow: auto; white-space: pre-wrap;
	color: var(--dim); background: var(--code-bg);
	padding: var(--ij-space) var(--ij-space-2);
}
/* An unchecked block reads as disabled in *.disabledText, the colour the theme
   names for it — not the enabled colours behind an opacity, which would tint
   the code fill behind the text as well. */
.pal-off, .pal-off .why, .pal-off .pal-meta, .pal-off pre { color: var(--ij-text-disabled); }
.pal-con { padding: var(--ij-space) var(--ij-space-3); color: var(--warn); }
`;
