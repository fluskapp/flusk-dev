/**
 * The markdown editor surface: the segmented [Preview | Split | Raw] control
 * that sits in a tab's toolbar, the split pane, the frontmatter property
 * table, and the peek gutter a search hit opens into.
 */
export const MD_CSS = `
.ed-bar {
	display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
	padding: 3px 12px; border-bottom: 1px solid var(--border); background: var(--panel);
}
.ed-bar .path { font: 11px var(--font-code); color: var(--dim); overflow: hidden; text-overflow: ellipsis; }
/* One control, three segments, 1px separators — no gaps, no radius. */
.seg { display: flex; border: 1px solid var(--border); background: var(--bg); }
.seg button {
	font-size: 11.5px; padding: 1px 9px; border-radius: 0;
	border-right: 1px solid var(--border); color: var(--dim);
}
.seg button:last-child { border-right: none; }
.seg button.on { background: var(--sel); color: var(--text); }
.seg button[disabled] { opacity: .45; cursor: default; }
.seg button[disabled]:hover { background: none; }

/* Split shares ONE page scroll: two independently scrolling panes inside a
   scrolling editor is three scrollbars and no way to know which one moved. */
.ed-body { display: flex; align-items: flex-start; min-height: 0; }
.ed-body > .md, .ed-body > .raw { flex: 1; min-width: 0; padding: 10px 18px 32px; }
.ed-body.split > .raw { border-right: 1px solid var(--border); }
/* .code caps a transcript's tool output at 340px; a document is not that. */
.ed-body > .raw {
	margin: 0; white-space: pre-wrap; overflow-wrap: anywhere;
	background: var(--code-bg); max-height: none; border-top: none;
}
.md pre.code { max-height: none; }
/* The run view is already padded, and its toolbar bleeds to the tab strip. */
#run .ed-bar { margin: -10px -16px 10px; }
#run .ed-body > .md, #run .ed-body > .raw { padding: 0; }
#run .ed-body.split > .raw { padding: 0 12px 0 0; }
/* Where "jump to failing stage" landed. Same marker the peek gutter uses. */
.md .hit-line { background: var(--sel); box-shadow: inset 2px 0 0 var(--accent); }

table.fm {
	border-collapse: collapse; margin: 0 0 12px; font-size: 12px; width: 100%;
	max-width: 620px; border: 1px solid var(--border);
}
table.fm th.fm-k {
	text-align: left; font-weight: 400; color: var(--dim); padding: 1px 10px;
	width: 34%; background: var(--panel); border-bottom: 1px solid var(--border);
	white-space: nowrap; vertical-align: top;
}
table.fm td.fm-v { padding: 1px 10px; border-bottom: 1px solid var(--border); }

/* Peek: the lines a search hit lives on, with the editor's gutter. */
.peek-wrap { padding: 8px 18px 0; }
.peek-wrap > .dim { margin-bottom: 3px; }
.peek { font: 12px var(--font-code); border: 1px solid var(--border); }
#run .peek-wrap { padding: 0 0 8px; }
.peek-row { display: flex; align-items: baseline; border-left: 2px solid transparent; }
.peek-row:hover { background: var(--hover); }
.peek-row.hit-line { background: var(--sel); border-left-color: var(--accent); }
.peek-row .gutter { padding: 0 6px 0 0; }
.peek-row .text { padding-left: 8px; white-space: pre-wrap; overflow-wrap: anywhere; }
.peek-gap { color: var(--dim); padding: 1px 0 1px 52px; }
`;
