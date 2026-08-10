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

#brain { padding: 14px 20px 40px; max-width: 940px; }
.brain-head { font-size: 12px; color: var(--dim); margin-bottom: 14px; }
.brain-sec { margin-bottom: 26px; }
.brain-sec h3 {
	margin: 0 0 8px; font-size: 12px; text-transform: uppercase;
	letter-spacing: .5px; color: var(--dim);
	border-bottom: 1px solid var(--border); padding-bottom: 5px;
}
.goal {
	border: 1px solid var(--border); border-radius: 6px;
	padding: 8px 12px; margin-bottom: 10px; background: var(--panel);
}
.goal-head { display: flex; align-items: center; gap: 9px; margin-bottom: 6px; }
.goal-head .dim { margin-left: auto; }
.task {
	display: flex; align-items: center; gap: 9px;
	padding: 3px 0 3px 4px; font-size: 12.5px;
}
.fact {
	display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
	padding: 4px 0; font-size: 12.5px; border-bottom: 1px solid var(--border);
}
.fact .dim { margin-left: auto; }

.meta-actions { display: flex; gap: 6px; margin-left: auto; }
.act {
	font-size: 11.5px; color: var(--text); padding: 2px 10px;
	background: var(--bg); border: 1px solid var(--border); border-radius: 5px;
}
.act:hover { background: var(--hover); border-color: var(--dim); }
`;
