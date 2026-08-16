/**
 * The toolbar: Attention plus the numbered tool windows, the IA of
 * docs/experience.md — each title is the window's one sentence. The number
 * belongs to the window, not its position — it is the key WorkbenchKeys
 * binds, so a window that leaves the toolbar takes its number with it.
 * Flows and Ask left as windows (Runs and Chat absorbed them); 0 is the
 * tenth slot, IntelliJ-style, unbound until a window earns it.
 *
 * The active window's button is PRESSED (.on): route buttons via the router's
 * own active match, toggle buttons from the root search params — the state
 * sync client-tabs.ts kept and the first React port lost.
 */
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Ic } from "../system/Icon.js";

export interface PanelButton {
	icon: string;
	id: string;
	n: string;
	label: string;
	title: string;
	to?: string;
	toggles?: "side" | "chat" | "find" | "doc";
}

export const PANELS: PanelButton[] = [
	{ id: "side-btn", icon: "project", n: "1", label: "Projects", title: "What you have (1 / ⌘1)", toggles: "side" },
	{ id: "specs-btn", icon: "spec", n: "2", label: "Specs", title: "What you intend — the driving surface of spec-driven work (2 / ⌘2)", to: "/specs" },
	{ id: "runs-btn", icon: "run", n: "3", label: "Runs", title: "What happened: sessions, harness journals and flow runs, one table (3 / ⌘3)", to: "/runs" },
	{ id: "find-btn", icon: "find", n: "4", label: "Find", title: "Find text in your files (4 / ⌘4 / ⌘⇧F)", toggles: "find" },
	{ id: "chat-btn", icon: "chat", n: "5", label: "Chat", title: "Talk — with your code, with a spec, with a run (5 / ⌘5 / c)", toggles: "chat" },
	{ id: "docs-btn", icon: "book", n: "6", label: "Docs", title: "Read your own indexed markdown (6 / ⌘6 / d)", to: "/docs" },
	{ id: "graph-btn", icon: "graph", n: "7", label: "Graph", title: "What am I about to break (7 / ⌘7 / g)", to: "/graph" },
	{ id: "web-btn", icon: "globe", n: "8", label: "Web", title: "Read an external URL beside the code (8 / ⌘8 / u)", to: "/web" },
	{ id: "doc-btn", icon: "book", n: "9", label: "Documentation", title: "Symbol docs for the code on screen (9 / ⌘9)", toggles: "doc" },
];

export function Toolbar() {
	const search = useSearch({ strict: false });
	const navigate = useNavigate();
	const open = (key: "side" | "chat" | "find" | "doc"): boolean =>
		Boolean((search as Record<string, unknown>)[key] ?? (key === "side" || key === "chat"));
	const toggle = (key: "side" | "chat" | "find" | "doc") =>
		navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({ ...prev, [key]: !(prev[key] ?? (key === "side" || key === "chat")) }),
		});
	return (
		<header id="toolbar">
			<div className="logo">flusk</div>
			<Link
				id="overview-btn"
				to="/"
				search={search}
				title="What needs me (o)"
				activeProps={{ className: "on" }}
				activeOptions={{ exact: true }}
			>
				Attention
			</Link>
			{PANELS.map((p) =>
				p.to !== undefined ? (
					<Link key={p.id} id={p.id} to={p.to} search={search} title={p.title} activeProps={{ className: "on" }}>
						<Ic name={p.icon} size={14} />
						{p.label}
						<span className="n">{p.n}</span>
					</Link>
				) : (
					<button
						key={p.id}
						id={p.id}
						type="button"
						title={p.title}
						className={p.toggles !== undefined && open(p.toggles) ? "on" : undefined}
						aria-pressed={p.toggles !== undefined && open(p.toggles)}
						onClick={() => p.toggles && toggle(p.toggles)}
					>
						<Ic name={p.icon} size={14} />
						{p.label}
						<span className="n">{p.n}</span>
					</button>
				),
			)}
			<div className="spacer" />
			<button
				id="help-btn"
				type="button"
				title="Shortcuts (?)"
				// The palette owns the help sheet and listens on document in the
				// capture phase; the button speaks the same key it advertises.
				onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
			>
				?
			</button>
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
