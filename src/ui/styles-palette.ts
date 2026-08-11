/**
 * The command palette: IntelliJ's "Search Everywhere" — a card floating near
 * the top of the window, one dense row per hit, groups separated by a label
 * rather than a box, and a mode strip because the same card answers both
 * "what happened here" (history) and "where is that file" (Go to File).
 */
export const PALETTE_CSS = `
#palette { align-items: flex-start; padding-top: 10vh; }
.pal-card {
	display: flex; flex-direction: column; width: min(760px, 92vw); max-height: 74vh;
	background: var(--panel); border: 1px solid var(--border); overflow: hidden;
}
.pal-modes { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
.pal-modes button {
	font-size: 11.5px; padding: 3px 12px; border-radius: 0; color: var(--dim);
	border-right: 1px solid var(--border);
}
.pal-modes button.on { background: var(--sel); color: var(--text); box-shadow: inset 0 -2px 0 var(--accent); }
#pal-q {
	padding: 9px 12px; font: 14px var(--font-ui); color: var(--text);
	background: var(--panel); border: none; border-bottom: 1px solid var(--border);
	outline: none;
}
#pal-q::placeholder { color: var(--dim); }
#pal-list { overflow-y: auto; padding: 2px 0; }
.pal-group {
	padding: 5px 12px 1px; font-size: 11px; letter-spacing: .5px;
	text-transform: uppercase; color: var(--dim);
}
.pal-row {
	display: flex; gap: 10px; align-items: center; padding: 0 12px; cursor: pointer;
	white-space: nowrap; height: var(--row); border-left: 2px solid transparent;
}
.pal-row:hover { background: var(--hover); }
.pal-row.on { background: var(--sel); border-left-color: var(--accent); }
.pal-title { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pal-path { font: 12px var(--font-code); overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pal-path .dir { color: var(--dim); }
.pal-meta { color: var(--dim); font-size: 11.5px; flex: none; }
.pal-row mark { background: var(--match-bg); color: var(--match-fg); }
.pal-empty { padding: 12px; color: var(--dim); }
.pal-foot {
	display: flex; gap: 10px; align-items: center; padding: 4px 10px;
	border-top: 1px solid var(--border); background: var(--bg);
}
.pal-block { padding: 5px 12px; border-bottom: 1px solid var(--border); }
.pal-block label { display: flex; gap: 8px; align-items: baseline; cursor: pointer; }
.pal-block .why { color: var(--dim); font-size: 11.5px; }
.pal-block pre {
	margin: 4px 0 0 22px; max-height: 108px; overflow: auto; white-space: pre-wrap;
	color: var(--dim); background: var(--code-bg); padding: 5px 7px;
}
.pal-off { opacity: .45; }
.pal-con { padding: 5px 12px; color: var(--warn); }
`;
