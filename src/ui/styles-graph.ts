/**
 * The Graph tool window (8): its header line, its empty states, and the inline
 * SVG star.
 *
 * There is not one literal colour in this file. Every value is a token from
 * styles-theme.ts, so both themes are correct by construction — and that is
 * what makes the DIAGRAM theme-correct too: the SVG carries geometry only, and
 * every fill and stroke in it is a class resolved here.
 *
 * The two colours the drawing is allowed to mean something with are the ones
 * the workbench already uses that way: --accent for the thing you are asking
 * about and its structural neighbours (files, symbols, docs), --dim for the
 * historical ones (commits, runs). A third hue would be a new vocabulary for a
 * reader to learn on a panel they opened to answer one question.
 */
export const GRAPH_CSS = `
.gg-head {
	display: flex; align-items: baseline; gap: var(--ij-space-2);
	padding: 0 0 var(--ij-space-2); margin-bottom: var(--ij-space-2); border-bottom: 1px solid var(--border);
}
.gg-name { font: 600 var(--ij-fs-7) var(--font-code); color: var(--text); }
.gg-kind { font-size: var(--ij-fs-3); color: var(--dim); border: 1px solid var(--border); padding: 0 var(--ij-space); }
.gg-path, .gg-stat {
	font: var(--ij-fs-3) var(--font-code); color: var(--dim);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.gg-act { font-size: var(--ij-fs-4); white-space: nowrap; }

/* An unbuilt graph is a STATE, not a blank panel: it gets a heading, the
   sentence saying what is missing, and the button that fixes it. */
.gg-empty { padding: var(--ij-space-4) var(--ij-space-1); max-width: 62ch; }
.gg-empty h3 { margin: 0 0 var(--ij-space-2); font-size: var(--ij-fs-7); font-weight: 600; color: var(--text); }
.gg-empty p { margin: 0 0 var(--ij-space-2); font-size: var(--ij-fs-6); color: var(--dim); }
.gg-none { font-size: var(--ij-fs-5); color: var(--dim); padding: var(--ij-space-1) var(--ij-space-1) var(--ij-space-2); }
/* Truncation is part of the answer; it must not read as another row. */
.gg-note { font-size: var(--ij-fs-3); color: var(--dim); padding: var(--ij-space) var(--ij-space-1) 0; }

/* The why-cell: every row's justification. It is elided in JS to a character
   budget rather than by width, because a td cannot be told to shrink beside
   another td that already claims the free space (.tbl td.grow does). Nothing
   wraps: the table keeps the one-row-per-fact density the workbench has. */
.gg-why { font-size: var(--ij-fs-4); color: var(--dim); white-space: nowrap; }
/* A row that opens nothing must not look like a row that does. */
.gg-inert { cursor: default; opacity: .72; }
.gg-inert:hover { background: none; }

.gg-svg {
	display: block; width: 100%; height: auto;
	margin: var(--ij-space-1) 0 var(--ij-space-2); background: var(--code-bg); border: 1px solid var(--border);
}
.gg-svg text { font-family: var(--font-ui); }
.gg-cap { fill: var(--dim); letter-spacing: .5px; text-transform: uppercase; }
.gg-label { fill: var(--text); }
/* The edge kind, in the row rather than floating on the curve: a label on a
   line is the one thing in this drawing that could overlap another. */
.gg-ek { fill: var(--dim); font-family: var(--font-code); }
.gg-center-label { fill: var(--text); font-weight: 600; }
.gg-edge { fill: none; stroke: var(--border); stroke-width: 1; }
.gg-dot { stroke-width: 1; }
.gg-struct { fill: var(--accent-soft); stroke: var(--accent); }
.gg-hist { fill: var(--panel); stroke: var(--dim); }
.gg-center { fill: var(--accent); stroke: var(--accent); }
.gg-n { cursor: pointer; }
.gg-n:hover .gg-edge { stroke: var(--accent); }
.gg-n:hover .gg-label { fill: var(--accent); }
`;
