/**
 * The Web panel: address bar, provenance strip, reading list.
 *
 * Every colour here is an existing theme token, so the panel follows the
 * light/dark switch without adding a token that would have to be defined
 * twice. The "untrusted content" pill is the one deliberately loud element —
 * it uses the warning token because a reader who mistakes a fetched page for
 * something flusk wrote is the failure this whole panel is designed against.
 */
export const WEB_CSS = `
#web { padding: 0; display: flex; flex-direction: column; min-height: 0; }
.web-bar {
	display: flex; gap: var(--ij-space-2); align-items: center; padding: var(--ij-space-2) var(--ij-space-2);
	border-bottom: 1px solid var(--border); background: var(--panel);
}
#web-url {
	flex: 1; min-width: 0; padding: var(--ij-space-1) var(--ij-space-2); font: var(--ij-fs-6) var(--font-code);
	color: var(--text); background: var(--bg); border: 1px solid var(--border); outline: none;
}
#web-url:focus { border-color: var(--accent); }
.web-bar button {
	font: var(--ij-fs-4) var(--font-ui); padding: var(--ij-space-1) var(--ij-space-2); color: var(--text);
	background: var(--bg); border: 1px solid var(--border); cursor: pointer;
}
.web-bar button:hover { background: var(--hover); border-color: var(--accent); }
.web-meta {
	display: flex; gap: var(--ij-space-2); align-items: center; flex-wrap: wrap;
	padding: var(--ij-space) var(--ij-space-2); font-size: var(--ij-fs-3); color: var(--dim);
	border-bottom: 1px solid var(--border);
}
.web-src {
	font-family: var(--font-code); color: var(--accent);
	max-width: 46ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.web-pill {
	font: var(--ij-fs-1) var(--font-code); text-transform: uppercase;
	padding: 0 var(--ij-space); background: var(--hover); color: var(--dim);
}
.web-pill.fresh { color: var(--ok); }
/* Loud on purpose: fetched text is data, and the reader must never take it
   for something flusk asserted. */
.web-pill.untrusted { color: var(--warn); background: var(--code-bg); }
.web-note {
	padding: var(--ij-space-2) var(--ij-space-2); font-size: var(--ij-fs-4); color: var(--warn); background: var(--code-bg);
	border-bottom: 1px solid var(--border);
}
.web-md { padding: var(--ij-space-2) var(--ij-space-4) calc(var(--ij-space-4) * 2); }
.web-fail { padding: var(--ij-space-3) var(--ij-space-4); max-width: 72ch; }
.web-why {
	margin: var(--ij-space-2) 0; padding: var(--ij-space-2) var(--ij-space-2); font: var(--ij-fs-5) var(--font-code);
	color: var(--err); background: var(--code-bg); border: 1px solid var(--border);
}
.web-hint { font-size: var(--ij-fs-4); color: var(--dim); }
.web-host { font-family: var(--font-code); color: var(--dim); }
#web .sec { padding: var(--ij-space-2) var(--ij-space-4); }
`;
