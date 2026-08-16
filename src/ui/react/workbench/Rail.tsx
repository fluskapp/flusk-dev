/**
 * The vertical icon rail — the New UI's signature element. Tool windows are
 * GLYPHS on the left edge, not labeled buttons in a row: the digit rides the
 * tooltip, the active window gets the selection fill, and the bottom group
 * holds the two ambient controls (theme, help) exactly where WebStorm keeps
 * its own.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { Ic } from "../system/Icon.js";

interface RailItem {
	id: string;
	icon: string;
	title: string;
	n: string;
	to?: string;
	toggles?: "side" | "chat" | "find" | "doc";
}

const TOP: RailItem[] = [
	{ id: "r-side", icon: "project", title: "Projects", n: "1", toggles: "side" },
	{ id: "r-specs", icon: "spec", title: "Specs — what you intend", n: "2", to: "/specs" },
	{ id: "r-runs", icon: "run", title: "Runs — what happened", n: "3", to: "/runs" },
	{ id: "r-find", icon: "find", title: "Find in Files", n: "4", toggles: "find" },
	{ id: "r-chat", icon: "chat", title: "Chat — talk with code, spec or run", n: "5", toggles: "chat" },
	{ id: "r-docs", icon: "book", title: "Docs — your own markdown", n: "6", to: "/docs" },
	{ id: "r-graph", icon: "graph", title: "Graph — what am I about to break", n: "7", to: "/graph" },
	{ id: "r-web", icon: "globe", title: "Web — read a URL", n: "8", to: "/web" },
	{ id: "r-doc", icon: "file", title: "Documentation — symbol docs", n: "9", toggles: "doc" },
];

export function Rail({ search }: { search: Record<string, unknown> }) {
	const navigate = useNavigate();
	const toggle = (key: "side" | "chat" | "find" | "doc") =>
		navigate({
			to: ".",
			search: (prev: Record<string, unknown>) => ({
				...prev,
				[key]: !(prev[key] ?? (key === "side" || key === "chat")),
			}),
		});
	return (
		<nav id="rail" aria-label="Tool windows">
			<div className="rail-group">
				{TOP.map((it) =>
					it.to !== undefined ? (
						<Link
							key={it.id}
							id={it.id}
							to={it.to}
							search={search}
							className="rail-btn"
							title={`${it.title} (${it.n} / ⌘${it.n})`}
							activeProps={{ className: "rail-btn on" }}
						>
							<Ic name={it.icon} />
						</Link>
					) : (
						<button
							key={it.id}
							id={it.id}
							type="button"
							className={`rail-btn${search[it.toggles as string] === true ? " on" : ""}`}
							title={`${it.title} (${it.n} / ⌘${it.n})`}
							onClick={() => it.toggles && toggle(it.toggles)}
						>
							<Ic name={it.icon} />
						</button>
					),
				)}
			</div>
			<div className="rail-group rail-bottom">
				<button
					id="theme"
					type="button"
					className="rail-btn"
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
				<button
					id="help-btn"
					type="button"
					className="rail-btn"
					title="Shortcuts (?)"
					onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }))}
				>
					?
				</button>
			</div>
		</nav>
	);
}
