/**
 * The numbered tool-window keybindings, exactly the legacy digit gate:
 * 1-6, 8, 9, 0 and 7 for Flows — plain digit and ⌘digit — plus the letter
 * mnemonics. Digits never fire while typing in an input.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

const ROUTE_OF: Record<string, string> = {
	"2": "/runs", "3": "/docs", "7": "/flows", "8": "/graph", "9": "/web", "0": "/ask",
	o: "/", r: "/runs", d: "/docs", g: "/graph", u: "/web", a: "/ask",
};
const TOGGLE_OF: Record<string, "side" | "find" | "chat" | "doc"> = {
	"1": "side", "4": "find", "5": "chat", "6": "doc", c: "chat",
};

export function WorkbenchKeys() {
	const navigate = useNavigate();
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
			if (e.altKey || (e.ctrlKey && !e.metaKey)) return;
			const key = e.key;
			const route = ROUTE_OF[key];
			const togglable = TOGGLE_OF[key];
			if (route !== undefined && (!e.metaKey || /^[0-9]$/.test(key))) {
				e.preventDefault();
				navigate({ to: route, search: (prev: Record<string, unknown>) => prev });
			} else if (togglable !== undefined && (!e.metaKey || /^[0-9]$/.test(key))) {
				e.preventDefault();
				navigate({
					to: ".",
					search: (prev: Record<string, unknown>) => ({
						...prev,
						[togglable]: !(prev[togglable] ?? (togglable === "side" || togglable === "chat")),
					}),
				});
			} else if (key === "t" && !e.metaKey) {
				const el = document.documentElement;
				const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
				el.setAttribute("data-theme", next);
				localStorage.setItem("flusk-theme", next);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [navigate]);
	return null;
}
