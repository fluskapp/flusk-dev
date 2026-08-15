/**
 * The rail's keyboard, two thin layers over the shared kit:
 *
 * - a global bridge: "/" focuses the search field from anywhere outside an
 *   input, and the first j/k/Enter outside the editor area ADOPTS the tree —
 *   focus moves into the container (so the selection takes the focused
 *   fill) and the key is handled there, the legacy tree-zone default;
 * - the tree-only arrows: → expands or steps into, ← collapses or folds a
 *   child back to its parent — the part use-list-nav is too generic to know.
 */
import { useEffect, useRef } from "react";
import type { ListNav } from "../kit/use-list-nav.js";
import type { KeyLike, SpeedSearch } from "../kit/use-speed-search.js";
import type { VisRow } from "./tree-model.js";

export function treeArrowKey(
	rows: VisRow[],
	nav: ListNav,
	toggle: (name: string) => void,
	e: KeyLike,
): boolean {
	if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return false;
	const row = rows[nav.cursor];
	if (row === undefined) return false;
	const grab = () => {
		e.preventDefault();
		e.stopPropagation();
	};
	if (row.kind === "project") {
		if (e.key === "ArrowRight") {
			if (row.open) nav.setCursor(nav.cursor + 1);
			else toggle(row.p.name);
			grab();
			return true;
		}
		if (row.open) {
			toggle(row.p.name);
			grab();
			return true;
		}
		return false; // ← on a closed top-level row: nothing to fold into
	}
	if (e.key === "ArrowLeft") {
		for (let i = nav.cursor - 1; i >= 0; i--) {
			if (rows[i]?.kind === "project") {
				nav.setCursor(i);
				grab();
				return true;
			}
		}
	}
	return false;
}

export function useTreeKeys(
	searchRef: React.RefObject<HTMLInputElement | null>,
	nav: ListNav,
	search: SpeedSearch,
): void {
	const navRef = useRef(nav);
	navRef.current = nav;
	const ss = useRef(search);
	ss.current = search;
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t !== null && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))
				return; // fields keep their keys; leaving them is the field's own handler
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === "/") {
				e.preventDefault();
				searchRef.current?.focus();
				return;
			}
			// Keys in the editor area belong to the views; keys landing on the
			// tree container were already handled (and stopped) there.
			const tree = navRef.current.ref.current;
			if (t !== null && (t.closest("#main") !== null || (tree !== null && tree.contains(t)))) return;
			if (e.key === "j" || e.key === "k" || e.key === "Enter") {
				tree?.focus();
				navRef.current.handleKey(e, ss.current.query !== "");
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [searchRef]);
}
