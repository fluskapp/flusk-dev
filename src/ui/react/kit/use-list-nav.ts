/**
 * One keyboard for every list and tree: j/k and the arrows walk, Home/End
 * jump, PageUp/Down leap by one viewport, Enter opens the cursor row. The
 * cursor is state, not DOM focus — it survives blur, and kit.css paints it
 * in *.selectionInactiveBackground until the keyboard comes back.
 *
 * Rows announce themselves with data-at={index}; the hook keeps the cursor
 * row visible inside the nearest scrolling ancestor.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyLike, SpeedSearch } from "./use-speed-search.js";

export interface ListNav {
	cursor: number;
	setCursor: (i: number) => void;
	/** The focusable list container (tabIndex 0, className "knav"). */
	ref: React.RefObject<HTMLDivElement | null>;
	/** True when the key moved the cursor or opened the row. j/k belong to
	 * the speed search once a query is active, so they navigate only while
	 * searchActive is false; the arrows always do. */
	handleKey: (e: KeyLike, searchActive: boolean) => boolean;
}

const PAGE_FALLBACK = 20;

function scrollerOf(el: HTMLElement): HTMLElement {
	let n: HTMLElement | null = el;
	while (n !== null && n !== document.body) {
		const o = getComputedStyle(n).overflowY;
		if (o === "auto" || o === "scroll") return n;
		n = n.parentElement;
	}
	return el;
}

export function useListNav(count: number, onEnter: (i: number) => void): ListNav {
	const [cursor, setCursorState] = useState(0);
	const ref = useRef<HTMLDivElement | null>(null);
	const countRef = useRef(count);
	countRef.current = count;
	const enterRef = useRef(onEnter);
	enterRef.current = onEnter;
	const cursorRef = useRef(cursor);
	cursorRef.current = cursor;
	const setCursor = useCallback((i: number) => setCursorState(i), []);
	/* A filter that narrows the list must not strand the cursor below it. */
	useEffect(() => {
		setCursorState((c) => Math.min(c, Math.max(0, count - 1)));
	}, [count]);
	useEffect(() => {
		ref.current?.querySelector(`[data-at="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
	}, [cursor]);
	const handleKey = useCallback((e: KeyLike, searchActive: boolean): boolean => {
		if (e.ctrlKey || e.metaKey || e.altKey) return false;
		const max = countRef.current - 1;
		if (max < 0) return false;
		const move = (fn: (c: number) => number) =>
			setCursorState((c) => Math.max(0, Math.min(fn(c), max)));
		/* One viewport of rows, measured off a real row: PageDown in a dense
		 * table should land where the eye does, not on a magic constant. */
		const page = (): number => {
			const el = ref.current;
			const rowH = el?.querySelector<HTMLElement>("[data-at]")?.offsetHeight ?? 0;
			if (el === null || rowH === 0) return PAGE_FALLBACK;
			return Math.max(1, Math.floor(scrollerOf(el).clientHeight / rowH) - 1);
		};
		const k = e.key;
		if (k === "ArrowDown" || (k === "j" && !searchActive)) move((c) => c + 1);
		else if (k === "ArrowUp" || (k === "k" && !searchActive)) move((c) => c - 1);
		else if (k === "Home") move(() => 0);
		else if (k === "End") move(() => max);
		else if (k === "PageDown") move((c) => c + page());
		else if (k === "PageUp") move((c) => c - page());
		else if (k === "Enter") enterRef.current(cursorRef.current);
		else return false;
		e.preventDefault();
		e.stopPropagation();
		return true;
	}, []);
	return { cursor, setCursor, ref, handleKey };
}

/** The two list hooks in their one right order: navigation first (j/k only
 * while no query is active), then the speed search takes what remains. */
export function composeKeys(nav: ListNav, search: SpeedSearch): (e: KeyLike) => void {
	return (e) => {
		if (nav.handleKey(e, search.query !== "")) return;
		search.handleKey(e);
	};
}

/** Keys for an input serving as the search's visible face: Escape clears
 * the query (an empty one blurs instead), Enter and ArrowDown hand the
 * keyboard to the list the input filters. */
export function faceKeys(search: SpeedSearch, nav: ListNav) {
	return (e: { key: string; preventDefault(): void; currentTarget: { blur(): void } }) => {
		if (e.key === "Escape") {
			e.preventDefault();
			if (search.query !== "") search.clear();
			else e.currentTarget.blur();
		} else if (e.key === "Enter" || e.key === "ArrowDown") {
			e.preventDefault();
			nav.ref.current?.focus();
		}
	};
}
