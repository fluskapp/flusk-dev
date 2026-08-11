/**
 * Window chrome: toolbar, the numbered tool windows (left Projects, bottom
 * Find, right Chat), the editor area between them, and the status bar.
 * IntelliJ's frame — fixed rails, one scrolling middle, no shadows.
 *
 * Every value is a token. The two frame heights are tokens as well
 * (--ij-toolbar-h, --ij-status-h) because the splitter that runs down the left
 * rail has to start below the toolbar and stop above the status bar: three
 * places that must agree, and used to agree only by repeating 34 and 22.
 * The tool-window headers take ToolWindow.Header.inactiveBackground for their
 * fill; the 26px height is the workbench's own, not a theme key — which is
 * what --ij-tw-header-h records against it.
 */
export const CHROME_CSS = `
:root { --tw-left: 268px; --tw-right: 340px; --tw-bottom: 260px; }

#app {
	display: grid; height: 100vh; position: relative;
	grid-template:
		"tb tb tb" var(--ij-toolbar-h)
		"side main chat" minmax(0, 1fr)
		"side find chat" var(--tw-bottom)
		"st st st" var(--ij-status-h)
		/ var(--tw-left) minmax(0, 1fr) var(--tw-right);
}
body.chat-off #app { grid-template-columns: var(--tw-left) minmax(0, 1fr) 0; }
body.chat-off #chat { display: none; }
body.side-off #app { grid-template-columns: 0 minmax(0, 1fr) var(--tw-right); }
body.side-off.chat-off #app { grid-template-columns: 0 minmax(0, 1fr) 0; }
body.side-off #side { display: none; }
body.find-off #app {
	grid-template-rows: var(--ij-toolbar-h) minmax(0, 1fr) 0 var(--ij-status-h);
}
body.find-off #find { display: none; }

#toolbar {
	grid-area: tb; display: flex; align-items: center; gap: var(--ij-space-2);
	padding: 0 var(--ij-space-2);
	background: var(--panel); border-bottom: 1px solid var(--border);
}
.logo {
	width: 20px; height: 20px; /* design-exempt: the app mark's own square */
	background: var(--accent); color: var(--ij-button-default-fg);
	font-weight: 700; font-size: var(--ij-fs-2);
	display: flex; align-items: center; justify-content: center;
}
#toolbar button {
	font-size: var(--ij-fs-5); padding: var(--ij-space-1) var(--ij-space-2);
	border: 1px solid transparent;
}
#toolbar button .n {
	color: var(--dim); margin-right: var(--ij-space);
	font: var(--ij-fs-3) var(--font-code);
}
#toolbar button.on { background: var(--sel); border-color: var(--border); }
#toolbar button.on .n { color: var(--accent); }
#theme, #help-btn {
	font-size: var(--ij-fs-7); line-height: 1;
	padding: var(--ij-space-1) var(--ij-space-2);
}

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
/* 7px straddling the 1px border it drags — a pointer target, not a metric. */
#chat-grip { left: -3px; top: 0; bottom: 0; width: 7px; cursor: col-resize; } /* design-exempt: grip hit area */
#side-grip {
	left: calc(var(--tw-left) - 3px); width: 7px; cursor: col-resize; /* design-exempt: grip hit area */
	top: var(--ij-toolbar-h); bottom: var(--ij-status-h);
}
#find-grip { left: 0; right: 0; top: -3px; height: 7px; cursor: row-resize; } /* design-exempt: grip hit area */
body.side-off #side-grip, body.find-off #find-grip { display: none; }
/* ToolWindow.Header: one row of its own height, not padding that guesses. */
.tw-head {
	display: flex; align-items: center; gap: var(--ij-space-2);
	height: var(--ij-tw-header-h); padding: 0 var(--ij-space-3);
	font-size: var(--ij-fs-3); font-weight: 600;
	text-transform: uppercase; letter-spacing: .5px; color: var(--dim);
	position: sticky; top: 0; background: var(--ij-bg-tw-header); z-index: 1;
	border-bottom: 1px solid var(--border);
}
/* The tool window's number, exactly where IntelliJ prints it. */
.tw-num {
	font: 600 var(--ij-fs-1) var(--font-code); color: var(--accent);
	border: 1px solid var(--border); padding: 0 var(--ij-space); letter-spacing: 0;
}

/* min-height:0 on the grid items: without it their content, not the row,
   would set the height and the inner panes would never scroll. */
#main { grid-area: main; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
#views { flex: 1; overflow-y: auto; min-height: 0; }
.view { min-height: 100%; }
/* The editor's own inset, shared with the document reader in styles-md.ts. */
#overview, #runs, #brain, #project, #run {
	padding: var(--ij-space-2) var(--ij-space-4) calc(var(--ij-space-4) * 2);
	max-width: 1080px; /* design-exempt: the editor's reading measure */
}
#docs, #doc, #file { padding: 0; }

#crumbs {
	display: flex; align-items: center; gap: var(--ij-space); flex: none;
	padding: var(--ij-space-1) var(--ij-space-3);
	font-size: var(--ij-fs-4); color: var(--dim);
	border-bottom: 1px solid var(--border); white-space: nowrap; overflow: hidden;
}
#crumbs .sep { color: var(--border); }
#crumbs .leaf { color: var(--text); }

#status {
	grid-area: st; display: flex; align-items: center; gap: var(--ij-space-3);
	padding: 0 var(--ij-space-2); font-size: var(--ij-fs-3); color: var(--dim);
	background: var(--panel); border-top: 1px solid var(--border);
}
#status .st-path { font-family: var(--font-code); overflow: hidden; text-overflow: ellipsis; }
#status-activity { color: var(--accent); }

.empty {
	display: flex; height: 55%; align-items: center; justify-content: center;
	color: var(--dim); text-align: center;
}
.empty.small {
	display: block; height: auto; padding: var(--ij-space-3) var(--ij-space-2);
}
`;
