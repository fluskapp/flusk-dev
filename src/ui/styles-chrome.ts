/**
 * Window chrome: toolbar, the numbered tool windows (left Projects, bottom
 * Find, right Chat), the editor area between them, and the status bar.
 * IntelliJ's frame — fixed rails, one scrolling middle, no shadows.
 */
export const CHROME_CSS = `
:root { --tw-left: 268px; --tw-right: 340px; --tw-bottom: 260px; }

#app {
	display: grid; height: 100vh; position: relative;
	grid-template:
		"tb tb tb" 34px
		"side main chat" minmax(0, 1fr)
		"side find chat" var(--tw-bottom)
		"st st st" 22px
		/ var(--tw-left) minmax(0, 1fr) var(--tw-right);
}
body.chat-off #app { grid-template-columns: var(--tw-left) minmax(0, 1fr) 0; }
body.chat-off #chat { display: none; }
body.side-off #app { grid-template-columns: 0 minmax(0, 1fr) var(--tw-right); }
body.side-off.chat-off #app { grid-template-columns: 0 minmax(0, 1fr) 0; }
body.side-off #side { display: none; }
body.find-off #app { grid-template-rows: 34px minmax(0, 1fr) 0 22px; }
body.find-off #find { display: none; }

#toolbar {
	grid-area: tb; display: flex; align-items: center; gap: 6px;
	padding: 0 8px; background: var(--panel); border-bottom: 1px solid var(--border);
}
.logo {
	width: 20px; height: 20px; background: var(--accent);
	color: #fff; font-weight: 700; font-size: 10.5px;
	display: flex; align-items: center; justify-content: center;
}
#toolbar button {
	font-size: 12px; padding: 1px 8px; border: 1px solid transparent;
}
#toolbar button .n { color: var(--dim); margin-right: 5px; font: 11px var(--font-code); }
#toolbar button.on { background: var(--sel); border-color: var(--border); }
#toolbar button.on .n { color: var(--accent); }
#theme, #help-btn { font-size: 13px; line-height: 1; padding: 2px 7px; }

#side {
	grid-area: side; overflow-y: auto; min-width: 0; min-height: 0;
	background: var(--panel); border-right: 1px solid var(--border);
}

/* Every tool window's splitter, sitting on the border it drags. IntelliJ
   makes all three draggable; ah used to make only the chat rail. The left
   one hangs off #app rather than #side, which scrolls — a grip inside a
   scrolling rail scrolls away from the border it is supposed to be on. */
.tw-grip { position: absolute; z-index: 3; touch-action: none; }
.tw-grip:hover { background: var(--accent-soft); }
#chat-grip { left: -3px; top: 0; bottom: 0; width: 7px; cursor: col-resize; }
#side-grip {
	left: calc(var(--tw-left) - 3px); top: 34px; bottom: 22px; width: 7px; cursor: col-resize;
}
#find-grip { left: 0; right: 0; top: -3px; height: 7px; cursor: row-resize; }
body.side-off #side-grip, body.find-off #find-grip { display: none; }
.tw-head {
	display: flex; align-items: center; gap: 7px;
	padding: 5px 10px 4px; font-size: 11px; font-weight: 600;
	text-transform: uppercase; letter-spacing: .5px; color: var(--dim);
	position: sticky; top: 0; background: var(--panel); z-index: 1;
	border-bottom: 1px solid var(--border);
}
/* The tool window's number, exactly where IntelliJ prints it. */
.tw-num {
	font: 600 10px var(--font-code); color: var(--accent);
	border: 1px solid var(--border); padding: 0 4px; letter-spacing: 0;
}

/* min-height:0 on the grid items: without it their content, not the row,
   would set the height and the inner panes would never scroll. */
#main { grid-area: main; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
#views { flex: 1; overflow-y: auto; min-height: 0; }
.view { min-height: 100%; }
#overview, #runs, #brain, #project, #run, #graph { padding: 10px 16px 36px; max-width: 1080px; }
#docs, #doc, #file { padding: 0; }

#crumbs {
	display: flex; align-items: center; gap: 5px; flex: none;
	padding: 2px 12px; font-size: 11.5px; color: var(--dim);
	border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden;
}
#crumbs .sep { color: var(--border); }
#crumbs .leaf { color: var(--text); }

#status {
	grid-area: st; display: flex; align-items: center; gap: 14px;
	padding: 0 10px; font-size: 11px; color: var(--dim);
	background: var(--panel); border-top: 1px solid var(--border);
}
#status .st-path { font-family: var(--font-code); overflow: hidden; text-overflow: ellipsis; }
#status-activity { color: var(--accent); }

.empty {
	display: flex; height: 55%; align-items: center; justify-content: center;
	color: var(--dim); text-align: center;
}
.empty.small { display: block; height: auto; padding: 12px 10px; }
`;
