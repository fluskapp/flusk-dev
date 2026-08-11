/** Search field, toast, help overlay, kbd chips, action buttons, stat tiles. */
export const WIDGETS_CSS = `
#search {
	display: block; width: calc(100% - 20px); margin: 0 10px 6px;
	padding: 3px 7px; font: 12.5px var(--font-ui); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
	outline: none;
}
#search:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
#search::placeholder { color: var(--dim); }

#toast {
	position: fixed; bottom: 38px; left: 50%; transform: translateX(-50%);
	padding: 5px 14px; border-radius: 6px; font-size: 12.5px; z-index: 20;
	background: var(--text); color: var(--bg);
	box-shadow: 0 4px 16px rgba(0, 0, 0, .25);
}

.overlay {
	position: fixed; inset: 0; z-index: 10;
	background: rgba(0, 0, 0, .45);
	display: flex; align-items: center; justify-content: center;
}
.help-card {
	background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
	padding: 16px 24px 20px; min-width: 320px;
	box-shadow: 0 10px 40px rgba(0, 0, 0, .35);
}
.help-card h3 { margin: 0 0 10px; font-size: 13px; }
.keys { display: grid; grid-template-columns: auto 1fr; gap: 5px 16px; align-items: center; }
kbd {
	font: 600 11px var(--font-code); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); border-bottom-width: 2px;
	border-radius: 4px; padding: 1px 7px; text-align: center;
}

.stats-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.stat {
	flex: 1 1 110px; border: 1px solid var(--border); border-radius: 6px;
	background: var(--panel); padding: 7px 10px;
}
.stat-v { font: 600 18px var(--font-ui); }
.stat-l { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--dim); }
.stat-h { font-size: 11px; color: var(--dim); margin-top: 2px; }

.act {
	font-size: 11.5px; color: var(--text); padding: 2px 9px;
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
}
.act:hover { background: var(--hover); border-color: var(--dim); }
.act[disabled] { opacity: .5; cursor: default; }
.meta-actions { display: flex; gap: 6px; margin-left: auto; }
`;
