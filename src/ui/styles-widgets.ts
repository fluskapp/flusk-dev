/** Search field, toast, help overlay, kbd chips, action buttons, stat tiles. */
export const WIDGETS_CSS = `
#search {
	display: block; width: calc(100% - 16px); margin: 4px 8px 4px;
	padding: 2px 6px; font: 12.5px var(--font-ui); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); outline: none;
}
#search:focus { border-color: var(--accent); }
#search::placeholder { color: var(--dim); }

#toast {
	position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
	padding: 4px 12px; font-size: 12px; z-index: 20;
	background: var(--text); color: var(--bg); border: 1px solid var(--border);
}

.overlay {
	position: fixed; inset: 0; z-index: 10;
	background: rgba(0, 0, 0, .45);
	display: flex; align-items: center; justify-content: center;
}
.help-card {
	background: var(--panel); border: 1px solid var(--border);
	padding: 12px 18px 16px; min-width: 560px; max-height: 82vh; overflow: auto;
}
.help-card h3 { margin: 0 0 8px; font-size: 12.5px; }
/* Grouped, two columns of groups: the sheet is a map, not a list. */
.help-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 28px; }
.help-group > h4 {
	margin: 8px 0 4px; font-size: 10.5px; text-transform: uppercase; letter-spacing: .5px;
	color: var(--dim); border-bottom: 1px solid var(--border); padding-bottom: 2px;
}
.keys { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; align-items: center; }
kbd {
	font: 600 11px var(--font-code); color: var(--text);
	background: var(--bg); border: 1px solid var(--border);
	padding: 0 6px; text-align: center; white-space: nowrap;
}

.stats-row { display: flex; flex-wrap: wrap; gap: 1px; margin-bottom: 14px; }
.stat { flex: 1 1 110px; border: 1px solid var(--border); background: var(--panel); padding: 5px 9px; }
.stat-v { font: 600 17px var(--font-ui); }
.stat-l { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--dim); }
.stat-h { font-size: 11px; color: var(--dim); margin-top: 1px; }

.act {
	font-size: 11.5px; color: var(--text); padding: 1px 8px; border-radius: 0;
	background: var(--bg); border: 1px solid var(--border);
}
.act:hover { background: var(--hover); border-color: var(--dim); }
.act[disabled] { opacity: .5; cursor: default; }
.meta-actions { display: flex; gap: 5px; margin-left: auto; }
`;
