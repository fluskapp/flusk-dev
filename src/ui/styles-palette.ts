/**
 * The command palette: IntelliJ's "Search Everywhere" — a card floating near
 * the top of the window, one dense row per hit, groups separated by a label
 * rather than a box. Same tokens as the rest of the workbench, so it inherits
 * light/dark without a second palette to keep in sync.
 */
export const PALETTE_CSS = `
#palette { align-items: flex-start; padding-top: 11vh; }
.pal-card {
	display: flex; flex-direction: column; width: min(720px, 92vw); max-height: 72vh;
	background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
	box-shadow: 0 12px 48px rgba(0, 0, 0, .38); overflow: hidden;
}
#pal-q {
	padding: 11px 14px; font: 15px var(--font-ui); color: var(--text);
	background: var(--panel); border: none; border-bottom: 1px solid var(--border);
	outline: none;
}
#pal-q::placeholder { color: var(--dim); }
#pal-list { overflow-y: auto; padding: 4px 0; }
.pal-group {
	padding: 6px 14px 2px; font-size: 11px; letter-spacing: .5px;
	text-transform: uppercase; color: var(--dim);
}
.pal-row {
	display: flex; gap: 10px; align-items: baseline; padding: 3px 14px; cursor: pointer;
	white-space: nowrap;
}
.pal-row:hover { background: var(--hover); }
.pal-row.on { background: var(--sel); }
.pal-title { overflow: hidden; text-overflow: ellipsis; flex: 1; }
.pal-meta { color: var(--dim); font-size: 11.5px; flex: none; }
.pal-row mark { background: var(--accent-soft); color: var(--accent); border-radius: 2px; }
.pal-empty { padding: 14px; color: var(--dim); }
.pal-foot {
	display: flex; gap: 10px; align-items: center; padding: 6px 12px;
	border-top: 1px solid var(--border); background: var(--bg);
}
.pal-block { padding: 6px 14px; border-bottom: 1px solid var(--border); }
.pal-block label { display: flex; gap: 8px; align-items: baseline; cursor: pointer; }
.pal-block .why { color: var(--dim); font-size: 11.5px; }
.pal-block pre {
	margin: 4px 0 0 22px; max-height: 108px; overflow: auto; white-space: pre-wrap;
	color: var(--dim); background: var(--code-bg); border-radius: 4px; padding: 6px 8px;
}
.pal-off { opacity: .45; }
.pal-con { padding: 6px 14px; color: var(--warn); }
`;
