/**
 * The workbench shell: an IntelliJ window — toolbar of numbered tool windows,
 * Projects on the left, the tabbed editor area with its breadcrumb in the
 * middle, Find in Files along the bottom, Chat on the right, status bar
 * underneath.
 *
 * The only value interpolated into this document is `home`, and it goes
 * through escapeHtml. Everything else is a literal or a bundled asset, which
 * is what test/ui-page.test.ts pins.
 */
import { CLIENT_JS } from "./client-bundle.js";
import { CLIENT_CODE_JS } from "./client-code.js";
import { CLIENT_CODE_OUTLINE_JS } from "./client-code-outline.js";
import { CLIENT_DOC_JS, DOC_HTML } from "./client-doc.js";
import { CLIENT_DOC_NAV_JS } from "./client-doc-nav.js";
import { CLIENT_DOC_ROWS_JS } from "./client-doc-rows.js";
import { PALETTE_FILES_JS } from "./client-goto.js";
import { CLIENT_PALETTE_JS, PALETTE_HTML } from "./client-palette.js";
import { PALETTE_PROMPT_JS } from "./client-palette-prompt.js";
import { PALETTE_ROWS_JS } from "./client-palette-rows.js";
import { CHAT_HTML, FIND_HTML, HELP_HTML } from "./client-shell.js";
import { ALL_CSS } from "./styles-bundle.js";
import { CODE_CSS } from "./styles-code.js";
import { DOC_CSS } from "./styles-doc.js";
import { PALETTE_CSS } from "./styles-palette.js";

function escapeHtml(s: string): string {
	return s.replace(/[&<>"]/g, (c) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string;
	});
}

/**
 * Toolbar buttons: id, tool-window number, label, tooltip. The numbers are
 * IntelliJ's — 1 Projects … 6 Chat — and they are the same numbers the plain
 * digit keys and ⌘1…⌘6 bind to in client-keys.ts.
 *
 * 7's tooltip leads with the digits rather than F1: macOS maps F1 to
 * brightness-down unless the "standard function keys" setting is on, so on
 * this platform the F1 keycode usually never reaches the browser at all.
 */
const PANELS: Array<[string, string, string, string]> = [
	["side-btn", "1", "Projects", "Project tool window (1 / ⌘1)"],
	["runs-btn", "2", "Runs", "Sessions and harness journals (2 / ⌘2)"],
	["docs-btn", "3", "Docs", "Indexed markdown (3 / ⌘3)"],
	["brain-btn", "4", "Brain", "What ah knows (4 / ⌘4)"],
	["find-btn", "5", "Find", "Find in Files (5 / ⌘5 / ⌘⇧F)"],
	["chat-btn", "6", "Chat", "Chat tool window (6 / ⌘6 / c)"],
	["doc-btn", "7", "Documentation", "Documentation tool window (7 / ⌘7)"],
];

/**
 * The symbol-aware code viewer is what feeds the documentation window, and
 * `loadFile` (client-file.ts, inside CLIENT_JS) calls into it: both halves are
 * function declarations in the SAME script element, so hoisting makes the call
 * legal whichever order they are concatenated in. Shipped once — the guard is
 * for whoever later moves the module into the bundle itself.
 */
const CODE_JS = CLIENT_JS.includes("function codePositions(")
	? ""
	: CLIENT_CODE_JS + CLIENT_CODE_OUTLINE_JS;
const VIEWER_CSS = ALL_CSS.includes(".code-body") ? "" : CODE_CSS;

export function renderPage(home: string): string {
	const panels = PANELS.map(
		([id, n, label, title]) =>
			`<button id="${id}" title="${title}"><span class="n">${n}</span>${label}</button>`,
	).join("");
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ah</title>
<style>${ALL_CSS}${VIEWER_CSS}${PALETTE_CSS}${DOC_CSS}</style>
</head>
<body>
<div id="app">
    <header id="toolbar">
        <div class="logo">ah</div>
        <button id="overview-btn" title="What needs me (o)">Attention</button>
        ${panels}
        <div class="spacer"></div>
        <span id="count" class="dim small"></span>
        <button id="help-btn" title="Shortcuts (?)">?</button>
        <button id="theme" title="Toggle light/dark (t)">&#9681;</button>
    </header>
    <aside id="side">
        <div class="tw-head"><span class="tw-num">1</span><span>Projects</span></div>
        <input id="search" placeholder="Search (/)  project, path, kind" spellcheck="false"/>
        <div id="tree"></div>
    </aside>
    <main id="main">
        <div id="tabs"></div>
        <div id="crumbs"></div>
        <div id="views">
            <div id="overview" class="view"></div>
            <div id="runs" class="view" hidden></div>
            <div id="docs" class="view" hidden></div>
            <div id="brain" class="view" hidden></div>
            <div id="project" class="view" hidden></div>
            <div id="run" class="view" hidden></div>
            <div id="doc" class="view" hidden></div>
            <div id="file" class="view" hidden></div>
        </div>
    </main>
    ${CHAT_HTML}
    ${DOC_HTML}
    ${FIND_HTML}
    <footer id="status">
        <span id="status-cards" title="Runs, sessions and documents ah has indexed"></span>
        <span id="status-live" title="Runs in flight"></span>
        <span id="status-path" class="st-path" title="Current file"></span>
        <div class="spacer"></div>
        <span id="status-activity"></span>
        <span class="st-path">${escapeHtml(home)}</span>
        <span>ah v0.1.0</span>
    </footer>
</div>
<div id="toast" hidden></div>
${HELP_HTML}
${PALETTE_HTML}
<script>${CLIENT_JS}${CODE_JS}${PALETTE_PROMPT_JS}${PALETTE_ROWS_JS}${PALETTE_FILES_JS}${CLIENT_PALETTE_JS}${CLIENT_DOC_ROWS_JS}${CLIENT_DOC_NAV_JS}${CLIENT_DOC_JS}</script>
</body>
</html>`;
}
