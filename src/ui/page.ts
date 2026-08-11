/**
 * The workbench shell: an IntelliJ window — toolbar, project tool window on
 * the left, tabbed editor area in the middle, chat tool window on the right,
 * status bar underneath.
 *
 * The only value interpolated into this document is `home`, and it goes
 * through escapeHtml. Everything else is a literal or a bundled asset, which
 * is what test/ui-page.test.ts pins.
 */
import { CLIENT_JS } from "./client-bundle.js";
import { CHAT_HTML, HELP_HTML } from "./client-shell.js";
import { ALL_CSS } from "./styles-bundle.js";

function escapeHtml(s: string): string {
	return s.replace(/[&<>"]/g, (c) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string;
	});
}

/** Toolbar buttons: id, label, tooltip. The panel keys mirror client-keys. */
const PANELS: Array<[string, string, string]> = [
	["overview-btn", "Attention", "What needs me (1 / o)"],
	["runs-btn", "Runs", "Sessions and harness journals (2 / r)"],
	["docs-btn", "Docs", "Indexed markdown (3 / d)"],
	["brain-btn", "Brain", "What ah knows (4 / b)"],
];

export function renderPage(home: string): string {
	const panels = PANELS.map(
		([id, label, title]) => `<button id="${id}" title="${title}">${label}</button>`,
	).join("");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ah</title>
<style>${ALL_CSS}</style>
</head>
<body>
<div id="app">
	<header id="toolbar">
		<div class="logo">ah</div>
		<div class="crumb" id="crumb">workbench</div>
		<div class="spacer"></div>
		<span id="count" class="dim small"></span>
		${panels}
		<button id="chat-btn" title="Chat tool window (c)">Chat</button>
		<button id="help-btn" title="Shortcuts (?)">?</button>
		<button id="theme" title="Toggle light/dark (t)">&#9681;</button>
	</header>
	<aside id="side">
		<div class="tw-head">Projects</div>
		<input id="search" placeholder="Search (/)  project, path, kind" spellcheck="false"/>
		<div id="tree"></div>
	</aside>
	<main id="main">
		<div id="tabs"></div>
		<div id="views">
			<div id="overview" class="view"></div>
			<div id="runs" class="view" hidden></div>
			<div id="docs" class="view" hidden></div>
			<div id="brain" class="view" hidden></div>
			<div id="project" class="view" hidden></div>
			<div id="run" class="view" hidden></div>
			<div id="doc" class="view" hidden></div>
		</div>
	</main>
	${CHAT_HTML}
	<footer id="status">
		<span class="dim">${escapeHtml(home)}</span>
		<div class="spacer"></div>
		<span id="status-live" class="dim"></span>
		<span class="dim">ah v0.1.0</span>
	</footer>
</div>
<div id="toast" hidden></div>
${HELP_HTML}
<script>${CLIENT_JS}</script>
</body>
</html>`;
}
