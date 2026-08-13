/**
 * The tree's keyboard: "/" focuses search, j / k walk the visible rows,
 * Enter opens the cursor row — the legacy tree zone's defaults. Keys inside
 * #main belong to the editor area (tool nodes take Enter there), and keys
 * while typing belong to the field, except the ones that leave it.
 */
import { useEffect, useRef } from "react";
import type { VisRow } from "./tree-model.js";

export function useTreeKeys(
	searchRef: React.RefObject<HTMLInputElement | null>,
	rows: VisRow[],
	cursor: number,
	setCursor: (fn: (c: number) => number) => void,
	open: (row: VisRow) => void,
): void {
	const rowsRef = useRef(rows);
	rowsRef.current = rows;
	const cursorRef = useRef(cursor);
	cursorRef.current = cursor;
	const openRef = useRef(open);
	openRef.current = open;
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement | null;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
				const leaves = e.key === "Escape" || e.key === "Enter" || e.key === "ArrowDown";
				if (t === searchRef.current && leaves) {
					e.preventDefault();
					t.blur();
				}
				return;
			}
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			if (e.key === "/") {
				e.preventDefault();
				searchRef.current?.focus();
				return;
			}
			if (t !== null && t.closest("#main") !== null) return;
			const max = rowsRef.current.length - 1;
			if (e.key === "j") setCursor((c) => Math.min(c + 1, max));
			else if (e.key === "k") setCursor((c) => Math.max(c - 1, 0));
			else if (e.key === "Enter") {
				const row = rowsRef.current[cursorRef.current];
				if (row !== undefined) openRef.current(row);
			} else return;
			e.preventDefault();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [searchRef, setCursor]);
}
