import { CLIENT_BRAIN_JS } from "./client-brain.js";
import { CLIENT_DETAIL_JS } from "./client-detail.js";
import { CLIENT_KEYS_JS } from "./client-keys.js";
import { CLIENT_LIST_JS } from "./client-list.js";
import { CLIENT_RUNS_JS } from "./client-runs.js";
import { CHROME_CSS } from "./styles-chrome.js";
import { THEME_CSS } from "./styles-theme.js";
import { TRANSCRIPT_CSS } from "./styles-transcript.js";
import { WIDGETS_CSS } from "./styles-widgets.js";

function escapeHtml(s: string): string {
	return s.replace(/[&<>"]/g, (c) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string;
	});
}

const HELP_ROWS: Array<[string, string]> = [
	["/", "Search"],
	["j", "Next session"],
	["k", "Previous session"],
	["Enter", "Open first result"],
	["b", "Brain (goals, lessons, ledger)"],
	["n", "Runs (harness journals)"],
	["r", "Refresh"],
	["t", "Toggle theme"],
	["Esc", "Clear / close"],
	["?", "This panel"],
];

export function renderPage(home: string): string {
	const helpRows = HELP_ROWS.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join("");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ah</title>
<style>${THEME_CSS}${CHROME_CSS}${TRANSCRIPT_CSS}${WIDGETS_CSS}</style>
</head>
<body>
<div id="app">
	<header id="toolbar">
		<div class="logo">ah</div>
		<div class="crumb">sessions</div>
		<div class="spacer"></div>
		<span id="count" class="dim small"></span>
		<button id="runs-btn" title="Harness run journals (n)">Runs</button>
		<button id="brain-btn" title="Goals, lessons, unattended ledger (b)">Brain</button>
		<button id="help-btn" title="Shortcuts (?)">?</button>
		<button id="theme" title="Toggle light/dark (t)">&#9681;</button>
	</header>
	<aside id="side">
		<div class="tw-head">Sessions</div>
		<input id="search" placeholder="Search (/)  task, repo, status" spellcheck="false"/>
		<div id="list"></div>
	</aside>
	<main id="main">
		<div id="brain" hidden></div>
		<div id="runs" hidden></div>
		<div id="empty" class="empty">Select a session</div>
		<div id="detail" hidden>
			<div id="tabs"><div class="tab" id="tab-title"></div></div>
			<div id="meta"></div>
			<div id="transcript"></div>
		</div>
	</main>
	<footer id="status">
		<span class="dim">${escapeHtml(home)}</span>
		<div class="spacer"></div>
		<span class="dim">ah v0.1.0</span>
	</footer>
</div>
<div id="toast" hidden></div>
<div id="help" class="overlay" hidden>
	<div class="help-card"><h3>Shortcuts</h3><div class="keys">${helpRows}</div></div>
</div>
<script>${CLIENT_LIST_JS}${CLIENT_DETAIL_JS}${CLIENT_BRAIN_JS}${CLIENT_RUNS_JS}${CLIENT_KEYS_JS}</script>
</body>
</html>`;
}
