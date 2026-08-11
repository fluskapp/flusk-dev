/** Run view: meta bar, transcript messages, tool call rows, stage pipeline. */
export const TRANSCRIPT_CSS = `
#meta {
	display: flex; flex-wrap: wrap; gap: 6px 16px; align-items: center;
	padding: 0 0 10px; border-bottom: 1px solid var(--border); font-size: 12px;
}
.pill {
	padding: 1px 8px; border-radius: 10px; font-size: 10.5px; font-weight: 600;
	color: var(--on-accent); background: var(--run);
	text-transform: uppercase; letter-spacing: .4px;
}
.pill.completed { background: var(--ok); }
.pill.error { background: var(--err); }
/* blocked is MEDIUM in the attention rules; red would contradict that. */
.pill.blocked, .pill.stopped { background: var(--warn); }
.pill.running { background: var(--accent); }

#transcript { padding: 12px 0 20px; }
.msg { display: flex; gap: 12px; margin: 12px 0; }
.msg-tag {
	flex: none; width: 40px; text-align: right; font-size: 10.5px; font-weight: 700;
	padding-top: 2px; color: var(--tag-ah); text-transform: uppercase;
}
.msg.user .msg-tag { color: var(--tag-user); }
.msg-body { min-width: 0; flex: 1; }
.pre { white-space: pre-wrap; overflow-wrap: break-word; }
.msg.user .msg-body {
	background: var(--panel); border: 1px solid var(--border);
	border-left: 2px solid var(--tag-user); border-radius: 6px; padding: 7px 10px;
}

.tool {
	margin: 5px 0; border: 1px solid var(--border);
	border-radius: 6px; background: var(--panel); overflow: hidden;
}
.tool[open] { background: var(--bg); }
.tool.err { border-color: var(--err); }
.tool summary {
	display: flex; align-items: center; gap: 10px; padding: 4px 9px;
	cursor: pointer; list-style: none; user-select: none;
}
.tool summary::before { content: "▸"; color: var(--dim); font-size: 10px; }
.tool[open] summary::before { content: "▾"; }
.tool summary:hover { background: var(--hover); }
.tool-chip {
	font: 600 11px var(--font-code); color: var(--accent);
	background: var(--accent-soft); border-radius: 4px; padding: 1px 7px;
}
.tool-preview {
	font: 11.5px var(--font-code); color: var(--dim); min-width: 0;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tool-flag { margin-left: auto; color: var(--err); font-size: 11px; font-weight: 600; }
.code {
	margin: 0; padding: 8px 12px; background: var(--code-bg);
	border-top: 1px solid var(--border); overflow-x: auto; max-height: 340px;
}
.code.out { color: var(--text); }
.pad { padding: 5px 10px; }

.error-line {
	margin: 6px 0; padding: 5px 10px; color: var(--err); font-size: 12.5px;
	border: 1px solid var(--err); border-radius: 6px; background: var(--panel);
}
.compaction {
	margin: 14px 0; padding: 5px 10px; text-align: center; font-size: 11.5px;
	color: var(--dim); border-top: 1px dashed var(--border);
}
.stats { margin: 18px 0 0 52px; font-size: 12px; color: var(--dim); }
.running-note { margin: 18px 0 0 52px; font-size: 12px; color: var(--accent); }

.stages { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0; }
.stage {
	font: 10.5px var(--font-code); padding: 1px 6px; border-radius: 3px;
	background: var(--hover); color: var(--dim); border: 1px solid transparent;
}
.stage.completed { background: transparent; border-color: var(--ok); color: var(--ok); }
.stage.running { background: var(--accent); color: var(--on-accent); }
.stage.error { background: transparent; border-color: var(--err); color: var(--err); }
.stage.stopped { border-color: var(--warn); color: var(--warn); background: transparent; }
.stage[data-stage], .error-line[data-stage] { cursor: pointer; }
.error-line[data-stage]:hover { background: var(--hover); }
/* The journal body is markdown now (client-journal.ts + styles-md.ts); the
   pipeline above it keeps these rules. */
`;
