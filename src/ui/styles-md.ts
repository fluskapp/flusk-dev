/**
 * The document editor surface, drawn as IntelliJ draws an editor: a toolbar on
 * the editor background carrying the SegmentedButton [Preview | Split | Raw],
 * the split pane, the frontmatter property table, and the peek gutter a search
 * hit opens into.
 *
 * Every value is a token; the keys the interesting ones came from:
 *   .ed-bar rule     Editor.Toolbar.borderColor — the same hairline as
 *                    *.separatorColor in both themes, which is --border.
 *   .seg frame       Component.borderColor (--ij-border-control).
 *   .seg .on         SegmentedButton.selectedButtonColor (--ij-seg-selected),
 *                    and SegmentedButton.focusedSelectedButtonColor once the
 *                    control holds the focus: two fills the theme names
 *                    separately, never one fill at two opacities. Neither is
 *                    the list selection — they coincide only in light — so the
 *                    selected segment is the LIGHT pill IntelliJ draws, which
 *                    is why the track sits on the panel and not the editor.
 *   .seg [disabled]  *.disabledText, not the enabled colour behind opacity.
 *   .gutter          shared with Find in Files (styles-find.ts), so a line
 *                    number is the same column everywhere in the workbench.
 */
export const MD_CSS = `
.ed-bar {
	display: flex; align-items: center; gap: var(--ij-space-2); flex-wrap: wrap;
	padding: var(--ij-space-1) var(--ij-space-3);
	background: var(--ij-bg-editor); border-bottom: 1px solid var(--border);
}
.ed-bar .path {
	font: var(--ij-fs-3)/var(--ij-lh) var(--font-code); color: var(--dim);
	overflow: hidden; text-overflow: ellipsis;
}

/* One control, three segments, 1px separators — no gaps, no radius. */
.seg {
	display: flex; align-items: stretch;
	border: 1px solid var(--ij-border-control); background: var(--ij-bg-panel);
}
.seg button {
	height: var(--ij-row-h); padding: 0 var(--ij-space-2);
	font-size: var(--ij-fs-4); border-radius: 0; color: var(--dim);
	border-right: 1px solid var(--ij-border-control);
}
.seg button:last-child { border-right: none; }
.seg button:hover { background: var(--hover); color: var(--text); }
.seg button.on { background: var(--ij-seg-selected); color: var(--text); }
.seg:focus-within button.on { background: var(--ij-seg-selected-focused); }
.seg button:focus-visible {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
	outline-offset: calc(var(--ij-focus-ring-w) * -1);
}
.seg button[disabled] { color: var(--ij-text-disabled); cursor: default; }
.seg button[disabled]:hover { background: none; color: var(--ij-text-disabled); }

/* Split shares ONE page scroll: two independently scrolling panes inside a
   scrolling editor is three scrollbars and no way to know which one moved. */
.ed-body { display: flex; align-items: flex-start; min-height: 0; }
.ed-body > .md, .ed-body > .raw {
	flex: 1; min-width: 0;
	padding: var(--ij-space-2) var(--ij-space-4) calc(var(--ij-space-4) * 2);
}
/* EditorPane.splitBorder, which the dark theme names and the light one leaves
   to the separator both themes share. */
.ed-body.split > .raw { border-right: 1px solid var(--border); }
/* .code caps a transcript's tool output at 340px; a document is not that. */
.ed-body > .raw {
	margin: 0; white-space: pre-wrap; overflow-wrap: anywhere;
	background: var(--code-bg); max-height: none; border-top: none;
}
.md pre.code { max-height: none; }
/* The run view is already padded, and its toolbar bleeds to the tab strip. */
#run .ed-bar {
	margin: calc(var(--ij-space-2) * -1) calc(var(--ij-space-4) * -1) var(--ij-space-2);
}
#run .ed-body > .md, #run .ed-body > .raw { padding: 0; }
#run .ed-body.split > .raw { padding: 0 var(--ij-space-3) 0 0; }
/* Where "jump to failing stage" landed. Same marker the peek gutter uses, and
   the same reasoning: nothing here holds the keyboard, so it is the INACTIVE
   selection the theme names, not the focused one faded out. */
.md .hit-line {
	background: var(--ij-selection-inactive);
	box-shadow: inset var(--ij-space-1) 0 0 var(--accent);
}

/* Frontmatter as IntelliJ's property table: a 24px row per key, the key column
   striped (Table.stripeColor), one hairline between rows. Table.gridColor is
   Gray1 in dark, which is the editor background this table sits on — invisible
   — so the grid is the separator instead. */
table.fm {
	border-collapse: collapse; margin: 0 0 var(--ij-space-3);
	font-size: var(--ij-fs-5); width: 100%; max-width: 620px; /* design-exempt: table measure */
	border: 1px solid var(--border);
}
table.fm tr { height: var(--ij-row-h); }
table.fm th.fm-k {
	text-align: left; font-weight: 400; color: var(--dim);
	padding: var(--ij-space-1) var(--ij-space-2); width: 34%;
	background: var(--ij-bg-inset); border-bottom: 1px solid var(--border);
	white-space: nowrap; vertical-align: top;
}
table.fm td.fm-v {
	padding: var(--ij-space-1) var(--ij-space-2);
	border-bottom: 1px solid var(--border); vertical-align: top;
}

/* Peek: the lines a search hit lives on, with the editor's gutter running
   unbroken past the elided ranges. No hover — a peek row opens nothing. */
.peek-wrap { padding: var(--ij-space-2) var(--ij-space-4) 0; }
.peek-wrap > .dim { margin-bottom: var(--ij-space-1); }
.peek { font: var(--ij-fs-5)/var(--ij-lh-code) var(--font-code); border: 1px solid var(--border); }
#run .peek-wrap { padding: 0 0 var(--ij-space-2); }
.peek-row, .peek-gap {
	display: flex; align-items: flex-start;
	border-left: var(--ij-space-1) solid transparent;
}
.peek .gutter { align-items: flex-start; }
.peek-row.hit-line { background: var(--ij-selection-inactive); border-left-color: var(--accent); }
.peek .text {
	padding-left: var(--ij-space-2); white-space: pre-wrap; overflow-wrap: anywhere;
}
.peek-gap .text { color: var(--dim); }

/* A drawn flowchart. It scrolls sideways inside its own box rather than
   widening the document: a wide pipeline must never make the prose beside it
   scroll. The SVG keeps its intrinsic size so text stays at its designed
   weight instead of being scaled into blur. */
.mmd {
	margin: var(--ij-space-3) 0; padding: var(--ij-space-2);
	background: var(--code-bg); border: 1px solid var(--border);
	border-radius: var(--ij-radius-sm); overflow-x: auto;
}
.mmd svg { display: block; }
`;
