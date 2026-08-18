/**
 * The icon set: 16×16, stroke currentColor, drawn to the New UI's weight
 * (1.5px, rounded joins). An IDE without icons reads as a text dump — these
 * are the smallest set that lets every surface lead with a glyph.
 */
export const ICONS: Record<string, React.ReactNode> = {
	project: <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 2h4.5A1.5 1.5 0 0 1 14 6.5v5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" />,
	repo: <><path d="M4.5 2h7A1.5 1.5 0 0 1 13 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 12.5v-9A1.5 1.5 0 0 1 4.5 2Z" /><path d="M6 5h4M6 8h4" /></>,
	harness: <><circle cx="8" cy="8" r="2.2" /><path d="M8 2v2.2M8 11.8V14M2 8h2.2M11.8 8H14M4 4l1.6 1.6M10.4 10.4 12 12M12 4l-1.6 1.6M5.6 10.4 4 12" /></>,
	spec: <><path d="M4 2.5h6L13 5.5v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" /><path d="M5.5 8.5 7 10l3.5-3.5" /></>,
	run: <path d="M5 3.5v9l7-4.5-7-4.5Z" />,
	find: <><circle cx="7" cy="7" r="4" /><path d="m10 10 3.5 3.5" /></>,
	chat: <path d="M3 3.5h10a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H7l-3 2.5V11.5H3a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" />,
	book: <><path d="M8 3.5C6.8 2.6 5 2.5 3 2.8v9.7c2-.3 3.8-.2 5 .7 1.2-.9 3-.99 5-.7V2.8c-2-.3-3.8-.2-5 .7Z" /><path d="M8 3.5v9.7" /></>,
	graph: <><circle cx="8" cy="8" r="1.8" /><circle cx="3" cy="3.5" r="1.3" /><circle cx="13" cy="3.5" r="1.3" /><circle cx="3" cy="12.5" r="1.3" /><circle cx="13" cy="12.5" r="1.3" /><path d="M4.1 4.5 6.6 6.7M11.9 4.5 9.4 6.7M4.1 11.5l2.5-2.2M11.9 11.5 9.4 9.3" /></>,
	globe: <><circle cx="8" cy="8" r="5.5" /><path d="M2.5 8h11M8 2.5c-3.2 3.4-3.2 7.6 0 11M8 2.5c3.2 3.4 3.2 7.6 0 11" /></>,
	flow: <><circle cx="3.5" cy="8" r="1.5" /><circle cx="12.5" cy="4" r="1.5" /><circle cx="12.5" cy="12" r="1.5" /><path d="M5 8h3m3-4H8.5A1.5 1.5 0 0 0 7 5.5v5A1.5 1.5 0 0 0 8.5 12H11" /></>,
	file: <><path d="M4 2h5l3 3v9H4V2Z" /><path d="M9 2v3h3" /></>,
	terminal: <><path d="M2.5 3.5h11v9h-11v-9Z" /><path d="m4.5 6 2 1.75-2 1.75M8 10h3.5" /></>,
	write: <path d="m9.5 3 3.5 3.5L6 13.5H2.5V10L9.5 3ZM8 4.5 11.5 8" />,
	read: <><path d="M4 2h5l3 3v9H4V2Z" /><path d="M6 8h4M6 10.5h4" /></>,
	glob: <path d="M8 3v10M3.7 5.5l8.6 5M12.3 5.5l-8.6 5" />,
	copy: <><rect x="5.5" y="5.5" width="8" height="8" rx="1" /><path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h7" /></>,
	folder: <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 2h4.5A1.5 1.5 0 0 1 14 6.5v5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5v-7Z" />,
	check: <path d="m3.5 8.5 3 3 6-6.5" />,
	warn: <><path d="M8 2.5 14 13H2L8 2.5Z" /><path d="M8 6.5v3M8 11.4v.1" /></>,
	err: <><circle cx="8" cy="8" r="5.5" /><path d="m6 6 4 4M10 6l-4 4" /></>,
	user: <><circle cx="8" cy="5.5" r="2.5" /><path d="M3 13.5c.7-2.6 2.6-4 5-4s4.3 1.4 5 4" /></>,
	bot: <path d="M8 1.8 9.3 6l4.2.3-3.3 2.6 1.2 4.1L8 10.6 4.6 13l1.2-4.1L2.5 6.3 6.7 6 8 1.8Z" />,
	clock: <><circle cx="8" cy="8" r="5.5" /><path d="M8 4.8V8l2.2 1.6" /></>,
	branch: <><circle cx="4.5" cy="3.5" r="1.6" /><circle cx="4.5" cy="12.5" r="1.6" /><circle cx="11.5" cy="6" r="1.6" /><path d="M4.5 5.1v5.8M11.5 7.6c0 2.4-2.5 2.9-4.5 3.2" /></>,
	chip: <><rect x="4" y="4" width="8" height="8" rx="1" /><path d="M6.5 1.5v2.5M9.5 1.5v2.5M6.5 12v2.5M9.5 12v2.5M1.5 6.5h2.5M1.5 9.5h2.5M12 6.5h2.5M12 9.5h2.5" /></>,
	stop: <rect x="4" y="4" width="8" height="8" rx="1" />,
	attach: <path d="M13 7.5 8.2 12.3a3.2 3.2 0 0 1-4.5-4.5L8.9 2.6a2.1 2.1 0 0 1 3 3L7.1 10.4a1 1 0 0 1-1.5-1.5l4.3-4.3" />,
	think: <><path d="M5.5 10.5a4 4 0 1 1 5 0v1.5h-5v-1.5Z" /><path d="M6.5 14h3" /></>,
	close: <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />,
	plus: <path d="M8 3.5v9M3.5 8h9" />,
	theme: <><circle cx="8" cy="8" r="5.5" /><path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" stroke="none" /></>,
	help: <><circle cx="8" cy="8" r="5.5" /><path d="M6.3 6.4A1.8 1.8 0 1 1 8 8.3v.9M8 11.4v.1" /></>,
	chevron: <path d="m4.5 6.5 3.5 3.5 3.5-3.5" />,
};

/** Tool-name → glyph, so a transcript leads with what HAPPENED. */
export const TOOL_ICON: Record<string, string> = {
	write: "write",
	edit: "write",
	bash: "terminal",
	read: "read",
	grep: "find",
	glob: "glob",
	task: "bot",
};
