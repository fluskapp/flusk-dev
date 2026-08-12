/**
 * The toolbar: Attention plus the numbered tool windows. The number belongs
 * to the window, not its position — it is the key WorkbenchKeys binds, so a
 * window that leaves the toolbar takes its number with it. 7 belongs to
 * Flows; 0 is the tenth slot, IntelliJ-style.
 */
import { Link, useNavigate, useSearch } from "@tanstack/react-router";

export interface PanelButton {
	id: string;
	n: string;
	label: string;
	title: string;
	to?: string;
	toggles?: "side" | "chat" | "find" | "doc";
}

export const PANELS: PanelButton[] = [
	{ id: "side-btn", n: "1", label: "Projects", title: "Project tool window (1 / ⌘1)", toggles: "side" },
	{ id: "runs-btn", n: "2", label: "Runs", title: "Sessions and harness journals (2 / ⌘2)", to: "/runs" },
	{ id: "docs-btn", n: "3", label: "Docs", title: "Indexed markdown (3 / ⌘3)", to: "/docs" },
	{ id: "find-btn", n: "4", label: "Find", title: "Find in Files (4 / ⌘4 / ⌘⇧F)", toggles: "find" },
	{ id: "chat-btn", n: "5", label: "Chat", title: "Chat tool window (5 / ⌘5 / c)", toggles: "chat" },
	{ id: "doc-btn", n: "6", label: "Documentation", title: "Documentation tool window (6 / ⌘6)", toggles: "doc" },
	{ id: "flows-btn", n: "7", label: "Flows", title: "Flow runs and their prompts (7 / ⌘7)", to: "/flows" },
	{ id: "graph-btn", n: "8", label: "Graph", title: "What am I about to break (8 / ⌘8 / g)", to: "/graph" },
	{ id: "web-btn", n: "9", label: "Web", title: "Read a URL beside the code (9 / ⌘9 / u)", to: "/web" },
	{ id: "ask-btn", n: "0", label: "Ask AI", title: "Ask AI about what is on screen (0 / ⌘0 / a)", to: "/ask" },
];

export function Toolbar() {
	const search = useSearch({ strict: false });
	const navigate = useNavigate();
	const toggle = (key: "side" | "chat" | "find" | "doc") =>
		navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({ ...prev, [key]: !(prev[key] ?? (key === "side" || key === "chat")) }),
		});
	return (
		<header id="toolbar">
			<div className="logo">flusk</div>
			<Link id="overview-btn" to="/" search={search} title="What needs me (o)">
				Attention
			</Link>
			{PANELS.map((p) =>
				p.to !== undefined ? (
					<Link key={p.id} id={p.id} to={p.to} search={search} title={p.title}>
						<span className="n">{p.n}</span>
						{p.label}
					</Link>
				) : (
					<button key={p.id} id={p.id} type="button" title={p.title} onClick={() => p.toggles && toggle(p.toggles)}>
						<span className="n">{p.n}</span>
						{p.label}
					</button>
				),
			)}
			<div className="spacer" />
			<button id="help-btn" type="button" title="Shortcuts (?)">?</button>
			<button
				id="theme"
				type="button"
				title="Toggle light/dark (t)"
				onClick={() => {
					const el = document.documentElement;
					const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
					el.setAttribute("data-theme", next);
					localStorage.setItem("flusk-theme", next);
				}}
			>
				◑
			</button>
		</header>
	);
}
