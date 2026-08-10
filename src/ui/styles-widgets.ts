/** Search field, toast, help overlay, kbd chips, action buttons. */
export const WIDGETS_CSS = `
#search {
	display: block; width: calc(100% - 24px); margin: 0 12px 8px;
	padding: 4px 8px; font: 12.5px var(--font-ui); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
	outline: none;
}
#search:focus { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
#search::placeholder { color: var(--dim); }

#toast {
	position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
	padding: 6px 16px; border-radius: 6px; font-size: 12.5px; z-index: 20;
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
	padding: 18px 26px 22px; min-width: 300px;
	box-shadow: 0 10px 40px rgba(0, 0, 0, .35);
}
.help-card h3 { margin: 0 0 12px; font-size: 13px; }
.keys { display: grid; grid-template-columns: auto 1fr; gap: 7px 16px; align-items: center; }
kbd {
	font: 600 11px var(--font-code); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); border-bottom-width: 2px;
	border-radius: 4px; padding: 1px 7px; text-align: center;
}

#brain-btn { font-size: 12px; padding: 2px 10px; border: 1px solid var(--border); border-radius: 5px; }
#brain-btn.on { background: var(--accent); border-color: var(--accent); color: #fff; }

#brain, #runs, #overview { padding: 14px 20px 40px; max-width: 940px; }
#docs { padding: 0; }
#overview-btn, #docs-btn {
	font-size: 12px; padding: 2px 10px; border: 1px solid var(--border); border-radius: 5px;
}
#overview-btn.on, #docs-btn.on { background: var(--accent); border-color: var(--accent); color: #fff; }

.stats-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 22px; }
.stat {
	flex: 1 1 120px; border: 1px solid var(--border); border-radius: 6px;
	background: var(--panel); padding: 10px 12px;
}
.stat-v { font: 600 20px var(--font-ui); }
.stat-l { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--dim); }
.stat-h { font-size: 11px; color: var(--dim); margin-top: 3px; }
.act {
	display: flex; align-items: center; gap: 9px; padding: 5px 0;
	border-bottom: 1px solid var(--border); font-size: 12.5px;
}
.act .dim { margin-left: auto; white-space: nowrap; }
.act-kind {
	font: 10.5px var(--font-code); color: var(--dim);
	border: 1px solid var(--border); border-radius: 3px; padding: 0 5px;
}
`;
