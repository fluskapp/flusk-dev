/**
 * Theming, in three states that must all keep working: bare :root is light,
 * an explicit data-theme="dark" is dark, and the OS preference decides only
 * when the user has not chosen (so an explicit light choice still wins).
 *
 * No value is written here any more — everything comes from styles-tokens.ts.
 */
import {
	METRIC_VARS,
	rampVars,
	semanticVars,
	type ThemeName,
	TYPE_VARS,
} from "./styles-tokens.js";

/** One theme owns the raw ramps plus the semantic layer built on top. */
const vars = (t: ThemeName): string => `${rampVars(t)}\n\t${semanticVars(t)}`;

/**
 * The names the rest of the CSS already uses. They are aliases, not a second
 * palette: each one points at a single semantic token, so this slice could
 * change every value without touching another file.
 */
const ALIASES = `
	--bg: var(--ij-bg-surface);
	--panel: var(--ij-bg-panel);
	--hover: var(--ij-hover);
	/* The workbench draws one hairline everywhere, and IntelliJ's hairline is
	   the separator; --ij-border (Borders.color) is the darker frame line. */
	--border: var(--ij-separator);
	--text: var(--ij-text);
	--dim: var(--ij-text-secondary);
	--accent: var(--ij-accent);
	--accent-soft: var(--ij-accent-soft);
	--sel: var(--ij-selection);
	--ok: var(--ij-status-success);
	--err: var(--ij-status-error);
	--warn: var(--ij-status-warning);
	--run: var(--ij-text-secondary);
	--code-bg: var(--ij-bg-inset);
	--gutter-bg: var(--ij-bg-inset);
	--tag-user: var(--ij-status-warning);
	--tag-ah: var(--ij-accent);
	--match-bg: var(--ij-match-bg);
	--match-fg: var(--ij-match-fg);
	/* Text drawn ON a filled BADGE (Badge.blueForeground's pair, which the pill
	   colours share). A filled default button is not a badge: it takes
	   --ij-button-default-fg, which is white in both themes. */
	--on-accent: var(--ij-text-on-accent);
	/* One row height for every list in the workbench. Tree.rowHeight is 24px,
	   two more than the 22 ah used to draw: fidelity, not densification. */
	--row: var(--ij-row-h);
	--font-ui: var(--ij-font-ui);
	--font-code: var(--ij-font-mono);
`;

export const THEME_CSS = `
:root {
	${vars("light")}
	${METRIC_VARS}
	${TYPE_VARS}
	${ALIASES}
}
:root[data-theme="dark"] { ${vars("dark")} }
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) { ${vars("dark")} }
}

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
	margin: 0; background: var(--bg); color: var(--text);
	font: var(--ij-fs-6)/var(--ij-lh) var(--font-ui);
	-webkit-font-smoothing: antialiased;
}
pre, code, .code { font: var(--ij-fs-5)/var(--ij-lh-code) var(--font-code); }
button {
	font: inherit; color: inherit; background: none;
	border: none; cursor: pointer;
	border-radius: var(--ij-radius-sm); padding: var(--ij-space-1) var(--ij-space-2);
}
button:hover { background: var(--hover); }
::-webkit-scrollbar { width: 10px; height: 10px; } /* design-exempt: scrollbar furniture */
::-webkit-scrollbar-thumb { background: var(--border); }
::-webkit-scrollbar-thumb:hover { background: var(--dim); }
[hidden] { display: none !important; }
.dim { color: var(--dim); }
.small { font-size: var(--ij-fs-4); }
.spacer { flex: 1; }
mark, .hit { background: var(--match-bg); color: var(--match-fg); }
`;
