/**
 * IntelliJ's speed search: with a list or tree focused, typing narrows it
 * live — no input element of its own. The query is plain state; each list
 * chooses its visible face (the Projects rail shows it in its #search
 * field, the tables float the dim corner flag from speed-search.tsx).
 *
 * Precedence with the list keyboard: while the query is empty, j/k still
 * navigate (composeKeys asks the nav first); once a query exists every
 * printable key extends it, Backspace edits it and Escape clears it — so
 * Escape only reaches the workbench (to close a pane) when there is
 * nothing here left to clear.
 */
import { useCallback, useRef, useState } from "react";

/** What a native KeyboardEvent and React's synthetic one both provide, so
 * one handler serves a container's onKeyDown and a window listener alike. */
export interface KeyLike {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	preventDefault(): void;
	stopPropagation(): void;
}

export interface SpeedSearch {
	query: string;
	setQuery: (q: string) => void;
	clear: () => void;
	/** True when the key belonged to the search. Handled keys are swallowed
	 * (stopPropagation), so the workbench mnemonics underneath never fire —
	 * a focused list captures typing, exactly as an IDE tree does. */
	handleKey: (e: KeyLike) => boolean;
}

export function useSpeedSearch(initial = ""): SpeedSearch {
	const [query, setQuery] = useState(initial);
	const qRef = useRef(query);
	qRef.current = query;
	const clear = useCallback(() => setQuery(""), []);
	const handleKey = useCallback((e: KeyLike): boolean => {
		if (e.ctrlKey || e.metaKey || e.altKey) return false;
		const q = qRef.current;
		if (e.key === "Escape") {
			if (q === "") return false;
			setQuery("");
		} else if (e.key === "Backspace") {
			if (q === "") return false;
			setQuery(q.slice(0, -1));
		} else if (e.key.length === 1 && !(q === "" && e.key === " ")) {
			// A leading space never starts a search: alone it reads as a scroll
			// key, and an invisible one-character query is a mystery filter.
			setQuery(q + e.key);
		} else return false;
		e.preventDefault();
		e.stopPropagation();
		return true;
	}, []);
	return { query, setQuery, clear, handleKey };
}
