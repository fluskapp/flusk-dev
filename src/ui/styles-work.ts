/**
 * The editor area: the 30px tab strip, the dense tables the views are built
 * from, and the project view's model/tool/prompt blocks. Table density over
 * cards — a row per fact, 22px tall, nothing decorative.
 */
export const WORK_CSS = `
#tabs {
	display: flex; align-items: stretch; overflow-x: auto; flex: none; height: 30px;
	background: var(--panel); border-bottom: 1px solid var(--border);
}
#tabs .tab {
	display: flex; align-items: center; gap: 6px; cursor: pointer;
	padding: 0 8px; font-size: 12.5px; white-space: nowrap;
	border-right: 1px solid var(--border); border-bottom: 2px solid transparent;
	max-width: 240px;
}
#tabs .tab:hover { background: var(--hover); }
#tabs .tab.on { background: var(--bg); border-bottom-color: var(--accent); }
#tabs .tab .label { overflow: hidden; text-overflow: ellipsis; }
/* The kind glyph: md / run / session / doc / find, in the gutter font so the
   strip reads as a file list rather than a row of buttons. */
.glyph {
	font: 10px var(--font-code); color: var(--dim); text-transform: uppercase;
	border: 1px solid var(--border); padding: 0 3px; flex: none; letter-spacing: .2px;
}
#tabs .tab.on .glyph { color: var(--accent); border-color: var(--accent); }
/* Close is an affordance on hover (and on the active tab), like IntelliJ. */
#tabs .tab .x { color: var(--dim); font-size: 10px; visibility: hidden; }
#tabs .tab:hover .x, #tabs .tab.on .x { visibility: visible; }
#tabs .tab .x:hover { color: var(--err); }

.sec { margin: 0 0 16px; }
.sec > h3 {
	margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
	color: var(--dim); border-bottom: 1px solid var(--border); padding-bottom: 3px;
}
.sec > h3 .count { color: var(--dim); font-weight: 400; margin-left: 6px; }
/* No .calm variant: --ok means "this passed", and painting an empty state
   green made the success colour mean nothing wherever it did mean something. */
.line { padding: 4px 2px; color: var(--dim); font-size: 12.5px; }

.tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tbl tr { border-bottom: 1px solid var(--border); height: var(--row); }
/* Only a row that actually opens something looks like it does. Model rows,
   verify commands, tool tallies and ledger rows carry no data-open, and a
   pointer cursor over an inert row is a promise the workbench cannot keep. */
.tbl tbody tr[data-open] { cursor: pointer; }
.tbl tbody tr[data-open]:hover { background: var(--hover); }
.tbl tbody tr.cursor { background: var(--sel); box-shadow: inset 2px 0 0 var(--accent); }
.tbl td, .tbl th { padding: 1px 8px; text-align: left; vertical-align: middle; }
.tbl th { color: var(--dim); font-weight: 400; font-size: 11px; text-transform: uppercase; }
.tbl td.num, .tbl th.num { text-align: right; font: 11.5px var(--font-code); color: var(--dim); }
.tbl td.mono { font: 11.5px var(--font-code); color: var(--dim); }
.tbl td.grow { width: 100%; max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sev { width: 6px; height: 6px; border-radius: 50%; display: inline-block; background: var(--warn); }
.sev.high { background: var(--err); }
.attn-row td:first-child { width: 18px; }

a.ev, .ev { color: var(--accent); cursor: pointer; }
a.ev:hover, .ev:hover { text-decoration: underline; }

.chips { display: flex; flex-wrap: wrap; gap: 4px; }
.chip {
	font: 11.5px var(--font-code); border: 1px solid var(--border);
	padding: 0 6px; color: var(--dim);
}
/* A raw benchmark figure, not a verdict: 0.35 was as green as 0.90. */
.score { font: 11.5px var(--font-code); color: var(--dim); }

.prompt-block, .config-block {
	border: 1px solid var(--border); background: var(--panel); margin-bottom: 16px;
}
.prompt-block > summary, .config-block > summary {
	cursor: pointer; padding: 4px 10px; font-size: 12.5px; list-style: none;
	display: flex; align-items: center; gap: 8px;
}
.prompt-block > summary::before, .config-block > summary::before { content: "▸"; color: var(--dim); font-size: 10px; }
.prompt-block[open] > summary::before, .config-block[open] > summary::before { content: "▾"; }
.prompt-text {
	margin: 0; padding: 8px 10px; background: var(--code-bg); white-space: pre-wrap;
	border-top: 1px solid var(--border); max-height: 460px; overflow: auto;
}
.head-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.head-row h2 { margin: 0; font-size: 14px; }
.head-row .dim { font: 11.5px var(--font-code); }
`;
