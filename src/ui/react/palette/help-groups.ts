/**
 * The shortcut sheet's CONTENT: every gesture the client binds, grouped the
 * way the workbench is — an exact port of client-help-groups.ts. A shortcut
 * that is not in this file is a shortcut nobody can find. The palette's own
 * rows are appended into the "Search" group below, the same rows the legacy
 * palette moved there at boot.
 */
export type HelpRow = [string, string];
export type HelpGroup = { id: string; title: string; rows: HelpRow[] };

/** The rows the palette contributes to the shortcut sheet (#palette-help). */
const PALETTE_HELP_ROWS: HelpRow[] = [
	["⌘K", "Command palette — search all history"],
	["Tab", "Palette: History ↔ Files"],
	["⌘J", "Palette: next / previous hit (⌘K)"],
	["⌘⏎", "Palette: compose a prompt from the query"],
	["⌘P", "Palette: scope to the selected project / all projects"],
];

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
			["1", "Projects (⌘1)"],
			["2", "Runs (⌘2)"],
			["3", "Docs (⌘3)"],
			["4", "Find in Files (⌘4)"],
			["5", "Chat (⌘5)"],
			["6", "Documentation (⌘6)"],
			["8", "Graph — what am I about to break (⌘8)"],
			["9", "Web — read a URL (⌘9)"],
			["0", "Ask AI — the tenth window (⌘0)"],
			["o", "Attention"],
			["r", "Runs"],
			["d", "Docs"],
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
			["⌘⇧F", "Find in Files — ripgrep across your projects"],
			["⌘⇧O", "Go to File — fuzzy path search"],
			["⌘F", "Find in Files — except on a document, where it is the browser's"],
			...PALETTE_HELP_ROWS,
		],
	},
	{
		id: "help-find",
		title: "Find panel",
		rows: [
			["↓ ↑", "Find: next / previous hit"],
			["⏎", "Find: open the hit (or select the first)"],
			["Esc", "Find: close the panel"],
		],
	},
	{
		id: "help-doc",
		title: "Documentation",
		rows: [
			// Checked against browser defaults: ⌘B/Ctrl+B is unbound in Chrome and
			// Safari; ⌥F7 is bound by no browser; DevTools is bare F12 or ⌘⌥I.
			// 6 leads and F1 follows: macOS maps F1 to brightness-down unless the
			// "standard function keys" setting is on.
			["6 / ⌘6", "Documentation tool window — look up, or show"],
			["F1", "The same, where the keyboard sends F1 at all"],
			["⌘B", "Go to the definition of the selected symbol"],
			["⌥F7", "Find usages — hands the symbol to Find in Files"],
			["⌘F12", "File structure — focus the outline"],
		],
	},
	{
		id: "help-web",
		title: "Web",
		rows: [
			["9 / ⌘9", "Web tool window — fetch and read a URL"],
			["u", "The same, without the modifier"],
			["⏎", "Web: fetch the URL in the address box"],
			["Refresh", "Web: fetch again instead of using the cached copy"],
		],
	},
	{
		id: "help-ask",
		title: "Ask AI",
		rows: [
			["0 / a", "Ask AI about the file and symbol on screen"],
			["⌘⏎", "Ask: send the question (a bare ⏎ is a newline)"],
		],
	},
	{
		id: "help-graph",
		title: "Graph",
		rows: [
			["click", "Any identifier in a source file aims Graph and Documentation at it"],
			["8 / ⌘8 / g", "Graph — blast radius, co-change, provenance"],
		],
	},
	{
		id: "help-editor",
		title: "Editor",
		rows: [
			// ⌘W is NOT bound: browsers reserve it and ignore preventDefault.
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
