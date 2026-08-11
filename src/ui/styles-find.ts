/**
 * The Find in Files tool window: IntelliJ's bottom rail — a query line, then
 * a result TREE of file rows that expand into their matching lines. The line
 * gutter is fixed-width so numbers form a column, exactly as in the editor.
 *
 * The theme keys behind the tokens used here: the panel is
 * ToolWindow.background, its top edge Borders.color, the query field
 * Editor.SearchField.background inside Component.borderColor, the case and
 * regex toggles SearchOption.selectedBackground (--ij-search-option-on, a key
 * of its own: it equals the list selection in light and not in dark), rows
 * Tree.rowHeight inside Tree.border's insets, and a selected row is
 * *.selectionBackground while the panel holds focus and the separate
 * *.selectionInactiveBackground when it does not — two colours the theme
 * draws, not one colour faded.
 */
export const FIND_CSS = `
#find {
	grid-area: find; position: relative; min-width: 0; min-height: 0;
	display: flex; flex-direction: column;
	/* The frame between the editor and the tool window is Borders.color, which
	   IntelliJ draws darker than the hairline it uses inside a panel. */
	background: var(--ij-bg-panel); border-top: 1px solid var(--ij-border);
}

/* The query line is a toolbar, not a card: one hairline under it, no fill. */
#find-form {
	display: flex; align-items: center; flex: none; flex-wrap: wrap;
	gap: var(--ij-space); padding: var(--ij-space) var(--ij-space-2);
	border-bottom: 1px solid var(--ij-separator);
}
/* :not(checkbox) is load-bearing — an id beats the toggle's own class rule,
   so without it the hidden checkboxes would be given a field's box. */
#find-form input:not([type="checkbox"]), #find-form select {
	height: var(--ij-control-h); color: var(--ij-text);
	font: var(--ij-fs-6)/var(--ij-lh-tight) var(--ij-font-ui);
	background: var(--ij-bg-editor); border: 1px solid var(--ij-border-control);
	border-radius: var(--ij-radius); padding: 0 var(--ij-space-2); outline: none;
}
#find-form input::placeholder { color: var(--ij-text-disabled); }
#find-form input:not([type="checkbox"]):focus, #find-form select:focus {
	border-color: var(--ij-focus-ring);
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
}
#find-form input:not([type="checkbox"]):disabled, #find-form select:disabled {
	color: var(--ij-text-disabled); border-color: var(--ij-separator); cursor: default;
}
/* Widths in ch, off the mono face they are typed in: the theme carries a
   minimum size for a field but no width for a query or a glob. */
#find-q { flex: 1; min-width: 24ch; font-family: var(--ij-font-mono); }
#find-mask { width: 14ch; font-family: var(--ij-font-mono); }

/* SearchOption: a toggle that FILLS when it is on. The real checkbox stays in
   the DOM, zero-sized, so the tab order, the space key and the change event
   are still the browser's. */
.find-toggle {
	display: inline-flex; align-items: center; cursor: pointer; user-select: none;
}
.find-toggle input { appearance: none; position: absolute; margin: 0; width: 0; height: 0; }
.find-toggle span {
	display: inline-flex; align-items: center; height: var(--ij-control-h);
	padding: 0 var(--ij-space-2); font-size: var(--ij-fs-4);
	color: var(--ij-text-secondary); border-radius: var(--ij-radius-sm);
}
.find-toggle:hover span { background: var(--ij-hover); color: var(--ij-text); }
.find-toggle input:checked ~ span {
	background: var(--ij-search-option-on); color: var(--ij-text);
}
.find-toggle input:focus-visible ~ span {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
}
.find-toggle input:disabled ~ span {
	color: var(--ij-text-disabled); background: none; cursor: default;
}

#find-note {
	margin-left: auto; font-size: var(--ij-fs-3);
	color: var(--ij-text-secondary); white-space: nowrap;
}
#find-note.warn { color: var(--ij-status-warning); }

/* List.border 4,0,4,0 — the list's own vertical inset, and nothing else. */
#find-results { flex: 1; overflow: auto; min-height: 0; padding: var(--ij-space) 0; }
.fx-file, .fx-line {
	display: flex; align-items: center; height: var(--row);
	cursor: pointer; white-space: nowrap; color: var(--ij-text);
}
/* Tree.border 4,12,4,12: the tree's horizontal inset on the file row. A match
   row is indented by its own gutter, which is the indent and the column. */
.fx-file { gap: var(--ij-space); padding: 0 var(--ij-space-3); }
.fx-line { gap: var(--ij-space-2); padding-right: var(--ij-space-3); }
.fx-file:hover, .fx-line:hover { background: var(--ij-hover); }
/* A filled row, no stripe: IntelliJ's tree marks selection with the fill
   alone, and keeps it while the pointer is elsewhere on the row. */
.fx-file.on, .fx-line.on {
	background: var(--ij-selection-inactive); color: var(--ij-selection-text);
}
#find:focus-within .fx-file.on, #find:focus-within .fx-line.on {
	background: var(--ij-selection);
}
#find .twisty {
	width: var(--ij-space-3); flex: none; text-align: center;
	color: var(--ij-text-secondary); font-size: var(--ij-fs-1);
}
.fx-name, .fx-dir { overflow: hidden; text-overflow: ellipsis; }
.fx-dir, .fx-count {
	color: var(--ij-text-secondary);
	font: var(--ij-fs-3)/var(--ij-lh-tight) var(--ij-font-mono);
}
.fx-count { margin-left: auto; flex: none; }
/* The gutter: right-aligned, fixed width, monospace — a column, not a label.
   The file view's peek rows use it too, so it stays a standalone rule. */
.gutter {
	flex: none; width: calc(var(--ij-space-4) * 3); align-self: stretch;
	display: flex; align-items: center; justify-content: flex-end;
	color: var(--ij-text-secondary); background: var(--gutter-bg);
	font: var(--ij-fs-4)/var(--ij-lh-tight) var(--ij-font-mono);
	border-right: 1px solid var(--ij-separator); padding-right: var(--ij-space-2);
}
.fx-text {
	font: var(--ij-fs-5)/var(--ij-lh-tight) var(--ij-font-mono);
	overflow: hidden; text-overflow: ellipsis; min-width: 0;
}
.fx-empty { padding: var(--ij-space-3); color: var(--ij-text-secondary); }
`;
