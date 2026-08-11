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
			["o", "Attention"],
			["r", "Runs"],
			["d", "Docs"],
			["b", "Brain"],
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
