/**
 * The Documentation tool window (7): a right-docked rail beside Chat, the way
 * IntelliJ docks its own Documentation window — pinned, never a popup.
 *
 * It is a GRID COLUMN, not an overlay: a panel that floats over the editor
 * covers the code you are reading about. So `body.doc-on` re-states #app's
 * areas and columns with a fourth track; the row heights stay where
 * styles-chrome.ts left them, which is what keeps `find-off` working here.
 *
 * Every colour is a token from styles-theme.ts, so both themes are correct by
 * construction — there is not one literal colour in this file.
 */
export const DOC_CSS = `
:root { --tw-doc: 300px; }

/* Draggable, like every other tool window (styles-chrome.ts states the rule).
   It hangs off #docwin's left border, which does not scroll. */
#doc-grip { left: -3px; top: 0; bottom: 0; width: 7px; cursor: col-resize; } /* design-exempt: grip hit area */
body:not(.doc-on) #doc-grip { display: none; }

body.doc-on #app {
	grid-template-areas:
		"tb tb tb tb"
		"side main doc chat"
		"side find find chat"
		"st st st st";
	grid-template-columns: var(--tw-left) minmax(0, 1fr) var(--tw-doc) var(--tw-right);
}
body.doc-on.side-off #app {
	grid-template-columns: 0 minmax(0, 1fr) var(--tw-doc) var(--tw-right);
}
body.doc-on.chat-off #app {
	grid-template-columns: var(--tw-left) minmax(0, 1fr) var(--tw-doc) 0;
}
body.doc-on.side-off.chat-off #app { grid-template-columns: 0 minmax(0, 1fr) var(--tw-doc) 0; }

#docwin {
	grid-area: doc; min-width: 0; min-height: 0; display: flex; flex-direction: column;
	background: var(--panel); border-left: 1px solid var(--border); position: relative;
}
body:not(.doc-on) #docwin { display: none; }

/* The symbol line: name, kind, and nothing that scrolls away from them. */
.dw-sym {
	display: flex; align-items: baseline; gap: var(--ij-space-2); flex: none;
	padding: var(--ij-space) var(--ij-space-3); border-bottom: 1px solid var(--border);
}
.dw-sym:empty { display: none; }
.dw-name { font: 600 var(--ij-fs-6) var(--font-code); color: var(--text); }
.dw-kind { font-size: var(--ij-fs-3); color: var(--dim); }
/* Which engine answered — the reason a thin panel is thin. */
.dw-badge {
	font: var(--ij-fs-1) var(--font-code); color: var(--dim); padding: 0 var(--ij-space);
	border: 1px solid var(--border);
}
/* Outlined rather than filled when it is carrying a value. The accent token is
   the same blue in BOTH themes while the on-accent token flips, so the filled
   form measured 4.28:1 in light and 3.85:1 in dark at 10px — under the 4.5:1
   that styles-theme.ts introduced on-accent to protect. Accent text on the
   panel background clears the bar in both themes. */
.dw-badge.on { color: var(--accent); border-color: var(--accent); }

#doc-body { flex: 1; overflow: auto; min-height: 0; padding-bottom: calc(var(--ij-space-4) * 1.5); }
.dw-sec { padding: var(--ij-space-2) var(--ij-space-3) var(--ij-space-2); border-bottom: 1px solid var(--border); }
.dw-sec h4 {
	margin: 0 0 var(--ij-space); font-size: var(--ij-fs-2); font-weight: 600; color: var(--dim);
	text-transform: uppercase; letter-spacing: .5px;
}
.dw-sub {
	margin: var(--ij-space-2) 0 var(--ij-space-1); font-size: var(--ij-fs-3); font-weight: 600; color: var(--dim);
}
.dw-sig pre, .dw-sig pre.code {
	margin: 0; padding: var(--ij-space-2) var(--ij-space-2); background: var(--code-bg); border: 1px solid var(--border);
	white-space: pre-wrap; overflow-x: auto;
}
.dw-doc { font-size: var(--ij-fs-6); }
.dw-doc p, .dw-doc ul, .dw-doc pre { margin: var(--ij-space) 0; }

/* @param / @returns: a definition table, not a paragraph of tag soup. */
.dw-tags { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--ij-space-1) var(--ij-space-2); }
.dw-k { font: var(--ij-fs-4) var(--font-code); color: var(--accent); }
.dw-v { min-width: 0; }

/* A ROW PER FACT, 22px tall - styles-work.ts's density contract, which this
   panel used to opt out of: wrapping rows turned thirteen RELATED entries into
   ~500px of a 300px rail, before Signature, Documentation, Defined in and
   Usages got any space at all. Nothing wraps; what does not fit is elided. */
.dw-row {
	display: flex; align-items: center; gap: var(--ij-space-2); height: var(--row);
	padding: 0 var(--ij-space); cursor: pointer; border-left: 2px solid transparent;
}
.dw-row:hover { background: var(--hover); border-left-color: var(--accent); }
/* A row that opens nothing must not look like a row that does: the pointer is
   a promise (styles-work.ts), and a .d.ts under node_modules cannot be served. */
.dw-inert { cursor: default; opacity: .72; }
.dw-inert:hover { background: none; border-left-color: transparent; }
.dw-row .glyph {
	flex: none;
	font: var(--ij-fs-1) var(--font-code); color: var(--dim); border: 1px solid var(--border); padding: 0 var(--ij-space-1);
}
.dw-t {
	flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* The why clause is the row's justification; an unexplained list is noise. */
.dw-why {
	flex: none; max-width: 48%; min-width: 0; font-size: var(--ij-fs-3); color: var(--dim);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dw-at, .dw-loc { flex: none; margin-left: auto; font: var(--ij-fs-3) var(--font-code); color: var(--dim); }
/* The act row is a sentence, not a fact, so it is the one row allowed to wrap. */
.dw-act { height: auto; padding: var(--ij-space-1) var(--ij-space); white-space: normal; }
.dw-count { font-size: var(--ij-fs-4); color: var(--text); }
.dw-act { color: var(--accent); font-size: var(--ij-fs-4); }
.dw-note { margin-top: var(--ij-space); font-size: var(--ij-fs-3); color: var(--dim); }
.dw-none { font-size: var(--ij-fs-4); color: var(--dim); }
.dw-empty { padding: var(--ij-space-4) var(--ij-space-3); font-size: var(--ij-fs-5); color: var(--dim); }
`;
