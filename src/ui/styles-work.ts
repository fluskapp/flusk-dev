/**
 * The editor area: the tab strip, the dense tables the views are built from,
 * and the project view's model/tool/prompt blocks. Table density over cards —
 * a row per fact, nothing decorative.
 */
export const WORK_CSS = `
#tabs {
	display: flex; align-items: stretch; overflow-x: auto; flex: none;
	background: var(--panel); border-bottom: 1px solid var(--border);
}
#tabs .tab {
	display: flex; align-items: center; gap: 7px; cursor: pointer;
	padding: 6px 10px 5px; font-size: 12.5px; white-space: nowrap;
	border-right: 1px solid var(--border); border-bottom: 2px solid transparent;
	max-width: 260px;
}
#tabs .tab:hover { background: var(--hover); }
#tabs .tab.on { background: var(--bg); border-bottom-color: var(--accent); font-weight: 600; }
#tabs .tab .label { overflow: hidden; text-overflow: ellipsis; }
#tabs .tab .x { color: var(--dim); font-size: 11px; }
#tabs .tab .x:hover { color: var(--err); }

.sec { margin: 0 0 20px; }
.sec > h3 {
	margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px;
	color: var(--dim); border-bottom: 1px solid var(--border); padding-bottom: 4px;
}
.sec > h3 .count { color: var(--dim); font-weight: 400; margin-left: 6px; }
.line { padding: 5px 2px; color: var(--dim); font-size: 12.5px; }
.line.calm { color: var(--ok); }

.tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tbl tr { border-bottom: 1px solid var(--border); }
/* Only a row that actually opens something looks like it does. Model rows,
   verify commands, tool tallies and ledger rows carry no data-open, and a
   pointer cursor over an inert row is a promise the workbench cannot keep. */
.tbl tbody tr[data-open] { cursor: pointer; }
.tbl tbody tr[data-open]:hover { background: var(--hover); }
.tbl tbody tr.cursor { background: var(--sel); }
.tbl td, .tbl th { padding: 3px 8px; text-align: left; vertical-align: baseline; }
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
	border-radius: 3px; padding: 0 6px; color: var(--dim);
}
.score { font: 11.5px var(--font-code); color: var(--ok); }

.prompt-block, .config-block {
	border: 1px solid var(--border); border-radius: 6px; background: var(--panel);
	margin-bottom: 20px;
}
.prompt-block > summary, .config-block > summary {
	cursor: pointer; padding: 6px 10px; font-size: 12.5px; list-style: none;
	display: flex; align-items: center; gap: 8px;
}
.prompt-block > summary::before, .config-block > summary::before { content: "▸"; color: var(--dim); font-size: 10px; }
.prompt-block[open] > summary::before, .config-block[open] > summary::before { content: "▾"; }
.prompt-text {
	margin: 0; padding: 10px 12px; background: var(--code-bg); white-space: pre-wrap;
	border-top: 1px solid var(--border); max-height: 460px; overflow: auto;
}
.head-row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.head-row h2 { margin: 0; font-size: 15px; }
.head-row .dim { font: 11.5px var(--font-code); }
`;
