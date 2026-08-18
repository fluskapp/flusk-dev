/**
 * The numbered tool-window keybindings, the digit map of docs/experience.md:
 * 0-9 — plain digit and ⌘digit — plus the letter mnemonics; 0 is Harness,
 * the tenth slot (Ask is gone — talking with your code is Chat's, so `a`
 * went with it). Digits never fire while typing in an input.
 *
 * Escape unwinds ONE layer per press, the client-keys.ts order: overlays
 * first (the palette swallows its own Escape in the capture phase before this
 * listener runs), then the find strip, then the doc window, then whatever
 * still holds focus is blurred — back to the editor. An Escape inside a field
 * that did not handle it itself just leaves the field.
 */
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { toggleTheme } from "./theme.js";

const ROUTE_OF: Record<string, string> = {
	"0": "/harness", "2": "/specs", "3": "/runs", "6": "/docs", "7": "/graph", "8": "/web",
	o: "/", r: "/runs", d: "/docs", g: "/graph", u: "/web",
};
const TOGGLE_OF: Record<string, "side" | "find" | "chat" | "doc"> = {
	"1": "side", "4": "find", "5": "chat", "9": "doc", c: "chat",
};

export function WorkbenchKeys() {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as Record<string, unknown>;
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			const typing = t !== null && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
			if (e.key === "Escape" && !e.altKey && !e.ctrlKey && !e.metaKey) {
				if (typing) { t.blur(); return; }
				const layer = search.find === true ? "find" : search.doc === true ? "doc" : null;
				if (layer !== null) {
					navigate({ to: ".", search: (prev: Record<string, unknown>) => ({ ...prev, [layer]: false }) });
				} else if (document.activeElement instanceof HTMLElement) {
					document.activeElement.blur();
				}
				return;
			}
			if (typing) return;
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
				// The rail button's own resolution: an unset data-theme means the OS
				// is choosing, so the first press must flip from what is on screen.
				toggleTheme();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [navigate, search]);
	return null;
}
