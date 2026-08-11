/**
 * The Web panel: address bar, provenance strip, reading list.
 *
 * Every colour here is an existing theme token, so the panel follows the
 * light/dark switch without adding a token that would have to be defined
 * twice. The "untrusted content" pill is the one deliberately loud element —
 * it uses the warning token because a reader who mistakes a fetched page for
 * something ah wrote is the failure this whole panel is designed against.
 */
export const WEB_CSS = `
#web { padding: 0; display: flex; flex-direction: column; min-height: 0; }
.web-bar {
	display: flex; gap: 6px; align-items: center; padding: 6px 10px;
	border-bottom: 1px solid var(--border); background: var(--panel);
}
#web-url {
	flex: 1; min-width: 0; padding: 3px 7px; font: 12.5px var(--font-code);
	color: var(--text); background: var(--bg); border: 1px solid var(--border); outline: none;
}
#web-url:focus { border-color: var(--accent); }
.web-bar button {
	font: 11.5px var(--font-ui); padding: 3px 9px; color: var(--text);
	background: var(--bg); border: 1px solid var(--border); cursor: pointer;
}
.web-bar button:hover { background: var(--hover); border-color: var(--accent); }
.web-meta {
	display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
	padding: 5px 10px; font-size: 11px; color: var(--dim);
	border-bottom: 1px solid var(--border);
}
.web-src {
	font-family: var(--font-code); color: var(--accent);
	max-width: 46ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.web-pill {
	font: 10px var(--font-code); text-transform: uppercase;
	padding: 0 5px; background: var(--hover); color: var(--dim);
}
.web-pill.fresh { color: var(--ok); }
/* Loud on purpose: fetched text is data, and the reader must never take it
   for something ah asserted. */
.web-pill.untrusted { color: var(--warn); background: var(--code-bg); }
.web-note {
	padding: 6px 10px; font-size: 11.5px; color: var(--warn); background: var(--code-bg);
	border-bottom: 1px solid var(--border);
}
.web-md { padding: 10px 16px 36px; }
.web-fail { padding: 14px 16px; max-width: 720px; }
.web-why {
	margin: 6px 0; padding: 6px 8px; font: 12px var(--font-code);
	color: var(--err); background: var(--code-bg); border: 1px solid var(--border);
}
.web-hint { font-size: 11.5px; color: var(--dim); }
.web-host { font-family: var(--font-code); color: var(--dim); }
#web .sec { padding: 10px 16px; }
`;
