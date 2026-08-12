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
.ask-wrap { padding: var(--ij-space-2) var(--ij-space-4) calc(var(--ij-space-4) * 2); }

.ask-head { display: flex; align-items: center; gap: var(--ij-space-2); margin-bottom: var(--ij-space-2); }
.ask-head select { max-width: 40ch; }
#ask-via { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 40%; }

.ask-ctx { border: 1px solid var(--border); background: var(--panel); margin-bottom: var(--ij-space-2); }
.ask-ctx-head {
	display: flex; align-items: center; gap: var(--ij-space-2);
	padding: var(--ij-space) var(--ij-space-2); border-bottom: 1px solid var(--border);
	font-size: var(--ij-fs-3); font-weight: 600; text-transform: uppercase;
	letter-spacing: .5px; color: var(--dim);
}
.ask-where {
	font: var(--ij-fs-3) var(--font-code); color: var(--accent); text-transform: none; letter-spacing: 0;
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 46%;
}

.ask-blk { border-bottom: 1px solid var(--border); }
.ask-blk-h {
	display: flex; align-items: center; gap: var(--ij-space-2); height: var(--row);
	padding: 0 var(--ij-space-2); cursor: pointer; font: var(--ij-fs-4) var(--font-code); color: var(--text);
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
	margin: 0; padding: var(--ij-space-2) var(--ij-space-2); max-height: 260px; overflow: auto; /* design-exempt: one-off scroll cap for an attached-context block */
	background: var(--code-bg); border-top: 1px solid var(--border);
	font: var(--ij-fs-4)/1.5 var(--font-code); white-space: pre; color: var(--text);
}
.ask-note { padding: var(--ij-space) var(--ij-space-2); font-size: var(--ij-fs-4); color: var(--dim); }
.ask-empty { padding: var(--ij-space-3) var(--ij-space-2); font-size: var(--ij-fs-5); color: var(--dim); text-align: left; }

.ask-acts { display: flex; flex-wrap: wrap; gap: var(--ij-space-2); margin-bottom: var(--ij-space-2); }
#ask-q {
	width: 100%; resize: vertical; padding: var(--ij-space-2) var(--ij-space-2);
	background: var(--bg); color: var(--text); border: 1px solid var(--border);
	font: var(--ij-fs-6)/1.5 var(--font-ui);
}
#ask-q:focus { outline: none; border-color: var(--accent); }
.ask-row { display: flex; align-items: center; gap: var(--ij-space-2); margin: var(--ij-space-2) 0 var(--ij-space-3); }

.ask-out { border-top: 1px solid var(--border); padding-top: var(--ij-space-2); }
.ask-answer { font-size: var(--ij-fs-6); line-height: 1.55; }
.ask-answer.pre { white-space: pre-wrap; font-family: var(--font-code); font-size: var(--ij-fs-5); }
.ask-fail { color: var(--err); font-size: var(--ij-fs-5); margin-bottom: var(--ij-space-2); }
.ask-sent { margin-top: var(--ij-space-3); }
.ask-sent summary { cursor: pointer; font-size: var(--ij-fs-4); color: var(--dim); }
.ask-sent pre {
	margin: var(--ij-space-2) 0 0; padding: var(--ij-space-2) var(--ij-space-2); max-height: 340px; overflow: auto; /* design-exempt: one-off scroll cap for the sent-prompt transcript */
	background: var(--code-bg); border: 1px solid var(--border);
	font: var(--ij-fs-4)/1.5 var(--font-code); white-space: pre-wrap; color: var(--text);
}
`;
