/** Editor area: tab strip, meta bar, transcript messages, tool call rows. */
export const TRANSCRIPT_CSS = `
#tabs {
	display: flex; position: sticky; top: 0; z-index: 2;
	background: var(--bg); border-bottom: 1px solid var(--border);
}
.tab {
	padding: 8px 16px; font-size: 12.5px; max-width: 60%;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
	border-bottom: 2px solid var(--accent); font-weight: 600;
}

#meta {
	display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center;
	padding: 10px 20px; border-bottom: 1px solid var(--border); font-size: 12px;
}
.pill {
	padding: 1px 9px; border-radius: 10px; font-size: 11px; font-weight: 600;
	color: #fff; background: var(--run); text-transform: uppercase; letter-spacing: .4px;
}
.pill.completed { background: var(--ok); }
.pill.error { background: var(--err); }
.pill.aborted, .pill.stopped { background: var(--warn); }
.pill.running { background: var(--accent); }

#transcript { padding: 14px 20px 40px; max-width: 940px; }
.msg { display: flex; gap: 12px; margin: 14px 0; }
.msg-tag {
	flex: none; width: 42px; text-align: right; font-size: 11px; font-weight: 700;
	padding-top: 2px; color: var(--tag-hit); text-transform: uppercase;
}
.msg.user .msg-tag { color: var(--tag-user); }
.msg-body { min-width: 0; flex: 1; }
.pre { white-space: pre-wrap; overflow-wrap: break-word; }
.msg.user .msg-body {
	background: var(--panel); border: 1px solid var(--border);
	border-left: 2px solid var(--tag-user); border-radius: 6px; padding: 8px 12px;
}

.tool {
	margin: 6px 0; border: 1px solid var(--border);
	border-radius: 6px; background: var(--panel); overflow: hidden;
}
.tool[open] { background: var(--bg); }
.tool.err { border-color: var(--err); }
.tool summary {
	display: flex; align-items: center; gap: 10px; padding: 5px 10px;
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
.pad { padding: 6px 12px; }

.error-line {
	margin: 6px 0; padding: 6px 12px; color: var(--err); font-size: 12.5px;
	border: 1px solid var(--err); border-radius: 6px; background: var(--panel);
}
.compaction {
	margin: 16px 0; padding: 6px 12px; text-align: center; font-size: 11.5px;
	color: var(--dim); border-top: 1px dashed var(--border);
}
.stats { margin: 22px 0 0 54px; font-size: 12px; color: var(--dim); }
.running-note { margin: 22px 0 0 54px; font-size: 12px; color: var(--accent); }
`;
