/**
 * The dense tables every view is built from — JBTable, in CSS.
 *
 * 24px rows (Tree.rowHeight / List.rowHeight), one hairline between them, a
 * header on the panel background with a bottom separator, a FILLED selection
 * whose colour states where the keyboard is (*.selectionBackground while this table has it,
 * *.selectionInactiveBackground once it moved to the tree — a different
 * colour, not the focused one at lower opacity), chips drawn as List.Tag, and
 * the project view's disclosures as control-height bars. Nothing is padded for
 * looks, nothing is rounded but the tags, and colour only ever means something.
 *
 * One deliberate deviation, and it covers the header rule too: Table.gridColor
 * and TableHeader.bottomSeparatorColor are both Gray12 / Gray1, and dark Gray1
 * IS the editor background these tables sit on, so either line would be
 * invisible in the dark theme (the light theme does not name the header key at
 * all). Every hairline here is *.separatorColor (--ij-separator), the line the
 * rest of the workbench already draws.
 */
export const TABLE_CSS = `
/* A section is IntelliJ's group header: a small uppercase label sitting on a
   separator, then its rows. One spacing step under it, never air. */
.sec { margin: 0 0 var(--ij-space-4); }
.sec > h3 {
	margin: 0 0 var(--ij-space-1); font-size: var(--ij-fs-3); text-transform: uppercase;
	letter-spacing: .5px; color: var(--ij-text-secondary);
	border-bottom: 1px solid var(--ij-separator); padding-bottom: var(--ij-space-1);
}
.sec > h3 .count { color: var(--ij-text-disabled); font-weight: 400; margin-left: var(--ij-space); }
/* An empty state is one ROW tall, so a table with nothing in it takes exactly
   the space one row of it would. No .calm variant: --ok means "this passed",
   and painting an empty state green made the success colour mean nothing
   wherever it did mean something. */
.line {
	display: flex; align-items: center; min-height: var(--ij-row-h);
	padding: 0 var(--ij-space-2); color: var(--ij-text-secondary); font-size: var(--ij-fs-6);
}

.tbl { width: 100%; border-collapse: collapse; font-size: var(--ij-fs-6); }
.tbl thead th {
	height: var(--ij-row-h); background: var(--ij-bg-panel); color: var(--ij-text-secondary);
	font-weight: 400; font-size: var(--ij-fs-3); text-transform: uppercase; letter-spacing: .5px;
	border-bottom: 1px solid var(--ij-separator);
}
.tbl tbody tr { height: var(--ij-row-h); border-bottom: 1px solid var(--ij-separator); }
/* No cell wraps. A JBTable row is one line tall and truncates what does not
   fit; wrapping is what turns a scannable list into a wall. The .grow cell is
   the column that absorbs the slack (width:100% + max-width:0), so the rest may
   take their natural width without pushing the table past its container. */
.tbl td, .tbl th {
	padding: 0 var(--ij-space-2); text-align: left; vertical-align: middle;
	white-space: nowrap;
}
/* Only a row that actually opens something looks like it does. Model rows,
   verify commands, tool tallies and ledger rows carry no data-open, and a
   pointer cursor over an inert row is a promise the workbench cannot keep. */
.tbl tbody tr[data-open] { cursor: pointer; }
.tbl tbody tr[data-open]:hover { background: var(--ij-hover); }
/* Both selection rules hang off body so they outrank the :hover above. */
body:not(.zone-view) .tbl tbody tr.cursor {
	background: var(--ij-selection-inactive); color: var(--ij-selection-text);
}
body.zone-view .tbl tbody tr.cursor {
	background: var(--ij-selection); color: var(--ij-selection-text);
}
/* nowrap, because these columns hold timestamps and counts. Table auto-layout
   gives the narrow trailing column whatever the flexible one leaves, and a
   wrapped "Aug 6, 02:25 PM" is three lines tall — it triples the height of
   every row in the table to show a value that was never the point. */
.tbl td.num, .tbl th.num {
	text-align: right; font: var(--ij-fs-4) var(--ij-font-mono); color: var(--ij-text-secondary);
	white-space: nowrap;
}
/* Truncate rather than nowrap: these carry journal filenames, which are long
   enough that refusing to wrap would push the title column out of the table.
   The tail is the disambiguating part, but the row is clickable and the title
   beside it already says which run this is — so an ellipsis costs nothing and
   a four-line filename costs every other row on the screen. */
.tbl td.mono {
	font: var(--ij-fs-4) var(--ij-font-mono); color: var(--ij-text-secondary);
	max-width: 24ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.tbl td.grow { width: 100%; max-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* The value that is not there, in *.disabledText: an absent field has to read
   as absent rather than as data. */
.off { color: var(--ij-text-disabled); }

.sev {
	width: var(--ij-space-2); height: var(--ij-space-2); border-radius: var(--ij-radius);
	display: inline-block; background: var(--ij-status-warning);
}
.sev.high { background: var(--ij-status-error); }
.attn-row td:first-child { width: var(--ij-row-h); }

a.ev, .ev { color: var(--ij-link); cursor: pointer; }
a.ev:hover, .ev:hover { text-decoration: underline; }
a.ev:focus-visible, .ev:focus-visible {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
	outline-offset: calc(-1 * var(--ij-focus-ring-w));
}

.chips { display: flex; flex-wrap: wrap; gap: var(--ij-space); }
/* List.Tag — a filled tag, not an outlined box: the outline read as a control
   you could press, and a tool name is not a control. */
.chip {
	display: inline-flex; align-items: center; height: var(--ij-space-4);
	font: var(--ij-fs-4) var(--ij-font-mono); color: var(--ij-text-secondary);
	background: var(--ij-separator); border-radius: var(--ij-radius-sm);
	padding: 0 var(--ij-space-2);
}
/* A raw benchmark figure, not a verdict: 0.35 was as green as 0.90. */
.score { font: var(--ij-fs-4) var(--ij-font-mono); color: var(--ij-text-secondary); }

/* The prompt and config disclosures: a control-height bar on the panel
   background with the body inset under it. Collapsed, each is one line. */
.prompt-block, .config-block {
	border: 1px solid var(--ij-separator); background: var(--ij-bg-panel);
	margin-bottom: var(--ij-space-4);
}
.prompt-block > summary, .config-block > summary {
	display: flex; align-items: center; gap: var(--ij-space-2); height: var(--ij-control-h);
	padding: 0 var(--ij-space-3); font-size: var(--ij-fs-6); cursor: pointer; list-style: none;
}
.prompt-block > summary:hover, .config-block > summary:hover { background: var(--ij-hover); }
.prompt-block > summary:focus-visible, .config-block > summary:focus-visible {
	outline: var(--ij-focus-ring-w) solid var(--ij-focus-ring);
	outline-offset: calc(-1 * var(--ij-focus-ring-w));
}
.prompt-block > summary::before, .config-block > summary::before {
	content: "▸"; color: var(--ij-text-secondary); font-size: var(--ij-fs-1);
}
.prompt-block[open] > summary::before, .config-block[open] > summary::before { content: "▾"; }
.prompt-text {
	margin: 0; padding: var(--ij-space-2) var(--ij-space-3); background: var(--ij-bg-inset);
	white-space: pre-wrap; border-top: 1px solid var(--ij-separator);
	max-height: 460px; overflow: auto; /* design-exempt: prompt preview cap */
}
.head-row {
	display: flex; align-items: baseline; gap: var(--ij-space-3); flex-wrap: wrap;
	margin-bottom: var(--ij-space-3);
}
.head-row h2 { margin: 0; font-size: var(--ij-fs-8); font-weight: 600; }
.head-row .dim { font: var(--ij-fs-4) var(--ij-font-mono); }
`;
