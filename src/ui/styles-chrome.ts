/**
 * Window chrome: toolbar, the two tool windows, the editor area between them,
 * and the status bar. IntelliJ's frame — fixed rails, one scrolling middle.
 */
export const CHROME_CSS = `
:root { --tw-left: 288px; --tw-right: 360px; }

#app {
	display: grid; height: 100vh;
	grid-template:
		"tb tb tb" 38px
		"side main chat" 1fr
		"st st st" 24px
		/ var(--tw-left) minmax(0, 1fr) var(--tw-right);
}
body.chat-off #app { grid-template-columns: var(--tw-left) minmax(0, 1fr) 0; }
body.chat-off #chat { display: none; }

#toolbar {
	grid-area: tb; display: flex; align-items: center; gap: 8px;
	padding: 0 10px; background: var(--panel); border-bottom: 1px solid var(--border);
}
.logo {
	width: 22px; height: 22px; border-radius: 5px; background: var(--accent);
	color: #fff; font-weight: 700; font-size: 11px;
	display: flex; align-items: center; justify-content: center;
}
.crumb { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#toolbar button {
	font-size: 12px; padding: 2px 10px;
	border: 1px solid var(--border); border-radius: 5px;
}
#toolbar button.on { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
#theme, #help-btn { font-size: 14px; line-height: 1; padding: 3px 8px; }

#side {
	grid-area: side; overflow-y: auto; min-width: 0; min-height: 0;
	background: var(--panel); border-right: 1px solid var(--border);
}
.tw-head {
	display: flex; align-items: center; gap: 8px;
	padding: 7px 12px 5px; font-size: 11px; font-weight: 600;
	text-transform: uppercase; letter-spacing: .5px; color: var(--dim);
	position: sticky; top: 0; background: var(--panel); z-index: 1;
}

/* min-height:0 on the grid items: without it their content, not the row,
   would set the height and the inner panes would never scroll. */
#main { grid-area: main; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
#views { flex: 1; overflow-y: auto; min-height: 0; }
.view { min-height: 100%; }
#overview, #runs, #brain, #project, #run { padding: 12px 18px 40px; max-width: 1080px; }
#docs, #doc { padding: 0; }

#status {
	grid-area: st; display: flex; align-items: center; gap: 12px;
	padding: 0 12px; font-size: 11px;
	background: var(--panel); border-top: 1px solid var(--border);
}

.empty {
	display: flex; height: 55%; align-items: center; justify-content: center;
	color: var(--dim); text-align: center;
}
.empty.small { display: block; height: auto; padding: 14px 12px; }
`;
