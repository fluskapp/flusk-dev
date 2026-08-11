/** IntelliJ "New UI" palette: light + dark, dark via toggle or OS preference. */

const DARK_VARS = `
	--bg: #1e1f22; --panel: #2b2d30; --hover: #313438;
	--border: #393b40; --text: #dfe1e5; --dim: #9da0a8;
	--accent: #3574f0; --accent-soft: #25324d; --sel: #2e436e;
	--ok: #57965c; --err: #e35252; --warn: #d6ae58; --run: #9da0a8;
	--code-bg: #26282b; --tag-user: #d6ae58; --tag-ah: #3574f0;
	/* Dark's accents are LIGHT, so white text on them fails contrast — white
	   on --warn #d6ae58 is ~2.1:1 at 10.5px bold, which is the status pill. */
	--on-accent: #1e1f22;
`;

export const THEME_CSS = `
:root {
	--bg: #ffffff; --panel: #f7f8fa; --hover: #eef0f2;
	--border: #ebecf0; --text: #1e1f22; --dim: #6c707e;
	--accent: #3574f0; --accent-soft: #edf3ff; --sel: #d4e2ff;
	--ok: #208a3c; --err: #db3b4b; --warn: #b07203; --run: #6c707e;
	--code-bg: #f7f8fa; --tag-user: #b07203; --tag-ah: #3574f0;
	/* Text drawn ON a filled accent (pills, badges, the running stage). */
	--on-accent: #ffffff;
	--font-ui: -apple-system, "Segoe UI", "Inter", "Helvetica Neue", sans-serif;
	--font-code: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
}
:root[data-theme="dark"] { ${DARK_VARS} }
@media (prefers-color-scheme: dark) {
	:root:not([data-theme="light"]) { ${DARK_VARS} }
}

* { box-sizing: border-box; }
html, body { height: 100%; }
body {
	margin: 0; background: var(--bg); color: var(--text);
	font: 13px/1.55 var(--font-ui);
	-webkit-font-smoothing: antialiased;
}
pre, code, .code { font: 12px/1.6 var(--font-code); }
button {
	font: inherit; color: inherit; background: none;
	border: none; cursor: pointer; border-radius: 4px; padding: 2px 8px;
}
button:hover { background: var(--hover); }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--dim); }
[hidden] { display: none !important; }
.dim { color: var(--dim); }
.small { font-size: 12px; }
.spacer { flex: 1; }
`;
