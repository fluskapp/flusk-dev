/**
 * The Find in Files tool window: IntelliJ's bottom rail — a query line, then
 * a result TREE of file rows that expand into their matching lines. The line
 * gutter is fixed-width so numbers form a column, exactly as in the editor.
 */
export const FIND_CSS = `
#find {
	grid-area: find; position: relative; min-width: 0; min-height: 0;
	display: flex; flex-direction: column;
	background: var(--panel); border-top: 1px solid var(--border);
}
#find-form {
	display: flex; align-items: center; gap: 6px; flex: none;
	padding: 4px 8px; border-bottom: 1px solid var(--border); flex-wrap: wrap;
}
#find-form input, #find-form select {
	font: 12.5px var(--font-ui); color: var(--text); background: var(--bg);
	border: 1px solid var(--border); border-radius: 0; padding: 2px 6px; outline: none;
}
#find-form input:focus, #find-form select:focus { border-color: var(--accent); }
#find-q { flex: 1; min-width: 160px; font-family: var(--font-code); }
#find-mask { width: 120px; font-family: var(--font-code); }
.find-toggle {
	display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: var(--dim);
	cursor: pointer; user-select: none;
}
.find-toggle input { accent-color: var(--accent); margin: 0; }
#find-note { font-size: 11px; color: var(--dim); margin-left: auto; white-space: nowrap; }
#find-note.warn { color: var(--warn); }

#find-results { flex: 1; overflow: auto; min-height: 0; padding-bottom: 8px; }
.fx-file {
	display: flex; align-items: center; gap: 6px; height: var(--row); cursor: pointer;
	padding: 0 10px; white-space: nowrap; border-left: 2px solid transparent;
}
.fx-file:hover { background: var(--hover); }
.fx-file.on { background: var(--sel); border-left-color: var(--accent); }
.fx-file .twisty { width: 12px; flex: none; text-align: center; color: var(--dim); font-size: 9px; }
.fx-name { font-weight: 600; }
.fx-dir { color: var(--dim); font: 11px var(--font-code); overflow: hidden; text-overflow: ellipsis; }
.fx-count { margin-left: auto; color: var(--dim); font: 11px var(--font-code); flex: none; }
.fx-line {
	display: flex; align-items: center; gap: 8px; height: var(--row); cursor: pointer;
	padding: 0 10px 0 24px; white-space: nowrap; border-left: 2px solid transparent;
}
.fx-line:hover { background: var(--hover); }
.fx-line.on { background: var(--sel); border-left-color: var(--accent); }
/* The gutter: right-aligned, fixed width, monospace — a column, not a label. */
.gutter {
	flex: none; width: 46px; color: var(--dim); align-self: stretch;
	display: flex; align-items: center; justify-content: flex-end;
	font: 11.5px var(--font-code); background: var(--gutter-bg);
	border-right: 1px solid var(--border); padding-right: 6px;
}
.fx-text {
	font: 12px var(--font-code); overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.fx-empty { padding: 12px 10px; color: var(--dim); }
`;
