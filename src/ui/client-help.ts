/**
 * The shortcut map, grouped the way the workbench is: moving around, the
 * numbered tool windows, the two search surfaces, the editor, the window.
 *
 * Every gesture the client binds appears here — a shortcut that is not in
 * this file is a shortcut nobody can find. The palette appends its own rows
 * into the "Search" group at boot (see client-palette.ts).
 */
export type HelpRow = [string, string];
export type HelpGroup = { id: string; title: string; rows: HelpRow[] };

export const HELP_GROUPS: HelpGroup[] = [
	{
		id: "help-nav",
		title: "Navigation",
		rows: [
			["/", "Search projects"],
			["j", "Next row"],
			["k", "Previous row"],
			["Enter", "Open selected row"],
			["Tab", "Cursor: tree ↔ table"],
			["Esc", "Clear / close"],
		],
	},
	{
		id: "help-tw",
		title: "Tool windows",
		rows: [
			["1", "Projects (&#8984;1)"],
			["2", "Runs (&#8984;2)"],
			["3", "Docs (&#8984;3)"],
			["4", "Brain (&#8984;4)"],
			["5", "Find in Files (&#8984;5)"],
			["6", "Chat (&#8984;6)"],
			["7", "Documentation (&#8984;7)"],
			["8", "Graph &mdash; what am I about to break (&#8984;8)"],
			["9", "Web &mdash; read a URL (&#8984;9)"],
			["0", "Ask AI &mdash; the tenth window (&#8984;0)"],
			["o", "Attention"],
			["r", "Runs"],
			["d", "Docs"],
			["b", "Brain"],
			["g", "Graph"],
			["u", "Web"],
			["a", "Ask AI"],
			["c", "Focus chat"],
		],
	},
	{
		id: "help-search",
		title: "Search",
		rows: [
			["&#8984;&#8679;F", "Find in Files — ripgrep across your projects"],
			["&#8984;&#8679;O", "Go to File — fuzzy path search"],
			["&#8984;F", "Find in Files — except on a document, where it is the browser's"],
		],
	},
	{
		id: "help-find",
		title: "Find panel",
		rows: [
			["&#8595; &#8593;", "Find: next / previous hit"],
			["&#9166;", "Find: open the hit (or select the first)"],
			["Esc", "Find: close the panel"],
		],
	},
	{
		id: "help-doc",
		title: "Documentation",
		rows: [
			// Checked against browser defaults: ⌘B/Ctrl+B is unbound in Chrome
			// and Safari (Firefox's bookmark sidebar is ⌘⇧B, which the shift
			// guard in client-keys.ts now leaves alone); ⌥F7 is bound by no
			// browser; and DevTools is bare F12 or ⌘⌥I — never ⌘F12.
			//
			// 7 leads and F1 follows: macOS maps F1 to brightness-down unless
			// the "standard function keys" setting is on, so advertising it
			// first pointed most readers here at a key that never arrives.
			["7 / &#8984;7", "Documentation tool window &mdash; look up, or show"],
			["F1", "The same, where the keyboard sends F1 at all"],
			["&#8984;B", "Go to the definition of the selected symbol"],
			["&#8997;F7", "Find usages &mdash; hands the symbol to Find in Files"],
			["&#8984;F12", "File structure &mdash; focus the outline"],
		],
	},
	{
		id: "help-web",
		title: "Web",
		rows: [
			// The panel reads a URL YOU typed. What comes back is a stranger's
			// text: it is rendered as data, and the only way it reaches the
			// chat is the delimited "fetched content" block Quote in chat
			// builds — never as raw text pasted into the composer.
			["9 / &#8984;9", "Web tool window &mdash; fetch and read a URL"],
			["u", "The same, without the modifier"],
			["&#9166;", "Web: fetch the URL in the address box"],
			["Refresh", "Web: fetch again instead of using the cached copy"],
		],
	},
	{
		id: "help-ask",
		title: "Ask AI",
		rows: [
			// The context is a SNAPSHOT: 0 / a / the toolbar button take a fresh
			// one, returning to the tab keeps the one the answer was about.
			["0 / a", "Ask AI about the file and symbol on screen"],
			["&#8984;&#9166;", "Ask: send the question (a bare &#9166; is a newline)"],
		],
	},
	{
		id: "help-graph",
		title: "Graph",
		rows: [
			// It follows Documentation: the gesture that AIMS it is not a key.
			["click", "Any identifier in a source file aims Graph and Documentation at it"],
			["8 / &#8984;8 / g", "Graph &mdash; blast radius, co-change, provenance"],
		],
	},
	{
		id: "help-editor",
		title: "Editor",
		rows: [
			// ⌘W is NOT bound: browsers reserve it and ignore preventDefault, so
			// it closed the whole session rather than one tab.
			["w", "Close the current tab"],
			["p", "Markdown: Preview"],
			["s", "Markdown: Split"],
			["R", "Markdown: Raw"],
		],
	},
	{
		id: "help-window",
		title: "Window",
		rows: [
			["t", "Toggle theme"],
			["?", "This panel"],
		],
	},
];

function groupHtml(g: HelpGroup): string {
	const rows = g.rows.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join("");
	return `<div class="help-group" id="${g.id}"><h4>${g.title}</h4><div class="keys">${rows}</div></div>`;
}

/** The shortcut sheet, pre-rendered: every row is a literal, never user data. */
export const HELP_HTML = `<div id="help" class="overlay" hidden>
	<div class="help-card"><h3>Shortcuts</h3>
	<div class="help-groups">${HELP_GROUPS.map(groupHtml).join("")}</div></div>
</div>`;
