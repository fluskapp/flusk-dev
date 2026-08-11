/**
 * The Ask-AI panel (8). An editor tab rather than a rail, so it gets the full
 * editor width — the attached context is source, and source wrapped into a
 * 300px column is unreadable, which would defeat the point of showing it.
 *
 * The context card is the loudest thing on the page ON PURPOSE: it is what
 * the user is being asked to trust before pressing Ask. A switched-off block
 * stays visible and goes dim rather than disappearing, because "what did I
 * turn off" has to be answerable at a glance.
 *
 * Every colour is a token from styles-theme.ts — not one literal in this file.
 */
export const ASK_CSS = `
.ask-wrap { padding: 10px 16px 36px; max-width: 1080px; }

.ask-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.ask-head select { max-width: 340px; }
#ask-via { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40%; }

.ask-ctx { border: 1px solid var(--border); background: var(--panel); margin-bottom: 10px; }
.ask-ctx-head {
	display: flex; align-items: center; gap: 8px;
	padding: 4px 8px; border-bottom: 1px solid var(--border);
	font-size: 11px; font-weight: 600; text-transform: uppercase;
	letter-spacing: .5px; color: var(--dim);
}
.ask-where {
	font: 11px var(--font-code); color: var(--accent); text-transform: none; letter-spacing: 0;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 46%;
}

.ask-blk { border-bottom: 1px solid var(--border); }
.ask-blk-h {
	display: flex; align-items: center; gap: 7px; height: var(--row);
	padding: 0 8px; cursor: pointer; font: 11.5px var(--font-code); color: var(--text);
}
.ask-blk-h:hover { background: var(--hover); }
/* The agent's own prompt: shown and counted like a block, but genuinely not
   switchable, so it carries no checkbox and no pointer promising one. */
.ask-blk-fixed .ask-blk-h { cursor: default; color: var(--accent); }
.ask-blk-fixed .ask-blk-h:hover { background: transparent; }
/* Off, not gone: "what did I exclude" must be answerable without a re-render. */
.ask-blk.off .ask-blk-h { color: var(--dim); }
.ask-blk.off .ask-blk-b { opacity: .45; }
.ask-blk-b {
	margin: 0; padding: 6px 10px; max-height: 260px; overflow: auto;
	background: var(--code-bg); border-top: 1px solid var(--border);
	font: 11.5px/1.5 var(--font-code); white-space: pre; color: var(--text);
}
.ask-note { padding: 5px 9px; font-size: 11.5px; color: var(--dim); }
.ask-empty { padding: 14px 10px; font-size: 12px; color: var(--dim); text-align: left; }

.ask-acts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
#ask-q {
	width: 100%; resize: vertical; padding: 6px 8px;
	background: var(--bg); color: var(--text); border: 1px solid var(--border);
	font: 12.5px/1.5 var(--font-ui);
}
#ask-q:focus { outline: none; border-color: var(--accent); }
.ask-row { display: flex; align-items: center; gap: 8px; margin: 6px 0 12px; }

.ask-out { border-top: 1px solid var(--border); padding-top: 10px; }
.ask-answer { font-size: 12.5px; line-height: 1.55; }
.ask-answer.pre { white-space: pre-wrap; font-family: var(--font-code); font-size: 12px; }
.ask-fail { color: var(--err); font-size: 12px; margin-bottom: 6px; }
.ask-sent { margin-top: 14px; }
.ask-sent summary { cursor: pointer; font-size: 11.5px; color: var(--dim); }
.ask-sent pre {
	margin: 6px 0 0; padding: 8px 10px; max-height: 340px; overflow: auto;
	background: var(--code-bg); border: 1px solid var(--border);
	font: 11.5px/1.5 var(--font-code); white-space: pre-wrap; color: var(--text);
}
`;
