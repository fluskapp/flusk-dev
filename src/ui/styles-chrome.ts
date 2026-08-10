/** App chrome: toolbar, left tool window, status bar — IntelliJ window layout. */
export const CHROME_CSS = `
#app {
	display: grid; height: 100vh;
	grid-template: "tb tb" 40px "side main" 1fr "st st" 25px / 300px 1fr;
}

#toolbar {
	grid-area: tb; display: flex; align-items: center; gap: 10px;
	padding: 0 10px; background: var(--panel); border-bottom: 1px solid var(--border);
}
.logo {
	width: 24px; height: 24px; border-radius: 6px; background: var(--accent);
	color: #fff; font-weight: 700; font-size: 11px;
	display: flex; align-items: center; justify-content: center;
}
.crumb { font-weight: 600; }
#theme { font-size: 15px; line-height: 1; padding: 3px 7px; }

#side {
	grid-area: side; overflow-y: auto;
	background: var(--panel); border-right: 1px solid var(--border);
}
.tw-head {
	padding: 8px 12px 6px; font-size: 12px; font-weight: 600; color: var(--dim);
	position: sticky; top: 0; background: var(--panel); z-index: 1;
}
.group-h {
	display: flex; align-items: center; gap: 6px;
	padding: 5px 12px 3px; font-weight: 600; font-size: 12px;
}
.group-h .count {
	margin-left: auto; color: var(--dim); font-weight: 400;
	background: var(--hover); border-radius: 8px; padding: 0 7px; font-size: 11px;
}
.row {
	display: flex; align-items: flex-start; gap: 8px;
	padding: 5px 12px 5px 18px; cursor: pointer; border-left: 2px solid transparent;
}
.row:hover { background: var(--hover); }
.row.active { background: var(--sel); border-left-color: var(--accent); }
.row-main { min-width: 0; }
.row-task {
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13px;
}
.row-sub { font-size: 11px; color: var(--dim); }
.dot {
	width: 8px; height: 8px; border-radius: 50%; flex: none; margin-top: 6px;
	background: var(--run);
}
.dot.completed { background: var(--ok); }
.dot.error { background: var(--err); }
.dot.aborted, .dot.stopped { background: var(--warn); }
.dot.running { background: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }

#main { grid-area: main; overflow-y: auto; }

#status {
	grid-area: st; display: flex; align-items: center; gap: 10px;
	padding: 0 12px; font-size: 11px;
	background: var(--panel); border-top: 1px solid var(--border);
}

.empty {
	display: flex; height: 60%; align-items: center; justify-content: center;
	color: var(--dim); text-align: center;
}
.empty.small { display: block; height: auto; padding: 16px 12px; }
`;
