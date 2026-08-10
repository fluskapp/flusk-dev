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

.meta-actions { display: flex; gap: 6px; margin-left: auto; }
.act {
	font-size: 11.5px; color: var(--text); padding: 2px 10px;
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
}
.act:hover { background: var(--hover); border-color: var(--dim); }
`;
