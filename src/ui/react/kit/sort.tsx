/**
 * Sortable JBTable headers. The sort travels as one URL-friendly string —
 * "cost" (descending, the legacy value the runs feed already used) or
 * "cost.asc" — and a click cycles none → desc → asc → none. The glyph slot
 * is always reserved, so a sort appearing never nudges the column.
 */
import type { ReactNode } from "react";
import "./kit.css";

export interface SortState {
	col: string;
	asc: boolean;
}

export function parseSort(s: string | undefined): SortState | null {
	if (s === undefined || s === "") return null;
	const [col = "", dir] = s.split(".");
	return col === "" ? null : { col, asc: dir === "asc" };
}

export function nextSort(s: SortState | null, col: string): string | undefined {
	if (s === null || s.col !== col) return col;
	return s.asc ? undefined : `${col}.asc`;
}

export function sortRows<T>(
	rows: T[],
	s: SortState | null,
	val: (r: T, col: string) => string | number | undefined,
): T[] {
	if (s === null) return rows;
	const dir = s.asc ? 1 : -1;
	return [...rows].sort((a, b) => {
		const x = val(a, s.col);
		const y = val(b, s.col);
		if (x === y) return 0;
		/* An absent value sinks whichever way the sort points: a run with no
		 * cost is not the cheapest run, it is a run that did not report one. */
		if (x === undefined) return 1;
		if (y === undefined) return -1;
		return x < y ? -dir : dir;
	});
}

export function SortTh({
	col,
	sort,
	onSort,
	className,
	children,
}: {
	col: string;
	sort: SortState | null;
	onSort: (next: string | undefined) => void;
	className?: string;
	children: ReactNode;
}) {
	const on = sort !== null && sort.col === col;
	const flip = (e: { preventDefault(): void; stopPropagation(): void }) => {
		// Swallowed: Enter on a header must not also open the cursor row.
		e.preventDefault();
		e.stopPropagation();
		onSort(nextSort(sort, col));
	};
	return (
		<th
			className={`sortable${className === undefined ? "" : ` ${className}`}`}
			tabIndex={0}
			aria-sort={on ? (sort.asc ? "ascending" : "descending") : "none"}
			onClick={flip}
			onKeyDown={(e) => {
				if (e.key === "Enter") flip(e);
			}}
		>
			{children}
			<span className="sort-g">{on ? (sort.asc ? "▲" : "▼") : ""}</span>
		</th>
	);
}
