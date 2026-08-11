/**
 * GFM tables, including the wrapped rows harness journals actually write:
 * a stage's detail is command output, so one row's cells can sit several
 * source lines apart.
 */

import type { Block } from "./markdown-blocks.js";
import { renderInline } from "./markdown-inline.js";

const SEP_CELL = /^:?-+:?$/;
/** How far a single table row may reach for the rest of a wrapped cell. */
const ROW_SPAN_MAX = 40;
/** Lines that end a wrapped row rather than continue it. */
const INTERRUPT = /^\s*(?:#{1,6}\s|```|&gt;|\||[-*]\s|\d+\.\s)/;

function cells(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/, "")
		.replace(/\|$/, "")
		.split("|")
		.map((c) => c.trim());
}

/** A GFM separator row: `|---|:--:|`. Decides whether the line above is a table. */
export function isTableSeparator(line: string): boolean {
	if (!line.includes("-") || !line.includes("|")) return false;
	const parts = cells(line);
	return parts.length > 0 && parts.every((c) => SEP_CELL.test(c));
}

/** A row is finished when it ends in `|` or has all the header's cells. */
function closed(text: string, width: number): boolean {
	return text.trimEnd().endsWith("|") || cells(text).length >= width;
}

/**
 * How many lines this row spans, or -1 when it never closes.
 *
 * Two passes, and the second one is the point. Pulling lines until something
 * INTERRUPTs meant a row that simply never finished swallowed the prose below
 * it — blank lines included — so `| 1 | 2` followed by forty lines of report
 * deleted all forty into one `<td>`. Looking ahead first means a row only
 * absorbs lines when a closer actually exists to absorb them up to.
 */
function rowSpan(lines: string[], start: number, width: number): number {
	let text = lines[start] ?? "";
	if (closed(text, width)) return start + 1;
	for (let i = start + 1; i < lines.length && i - start < ROW_SPAN_MAX; i++) {
		const line = lines[i] ?? "";
		if (INTERRUPT.test(line)) return -1;
		text += ` ${line.trim()}`;
		if (closed(text, width)) return i + 1;
	}
	return -1;
}

/** One row, which may be wrapped over several lines. */
function takeRow(lines: string[], start: number, width: number): [string | null, number] {
	const first = lines[start] ?? "";
	if (first.trim() === "" || !first.includes("|")) return [null, start];
	const span = rowSpan(lines, start, width);
	const end = span === -1 ? start + 1 : span;
	const text = lines
		.slice(start, end)
		.map((l, k) => (k === 0 ? l : l.trim()))
		.join(" ");
	const tds = cells(text).map((c) => `<td>${renderInline(c)}</td>`);
	return [`<tr>${tds.join("")}</tr>`, end];
}

export function takeTable(lines: string[], start: number): Block {
	const head = cells(lines[start] ?? "");
	let i = start + 2;
	const rows: string[] = [];
	while (i < lines.length) {
		const [row, next] = takeRow(lines, i, head.length);
		if (row === null) break;
		rows.push(row);
		i = next > i ? next : i + 1;
	}
	const th = head.map((c) => `<th>${renderInline(c)}</th>`).join("");
	const body = rows.length > 0 ? `<tbody>${rows.join("")}</tbody>` : "";
	return [`<table><thead><tr>${th}</tr></thead>${body}</table>`, i];
}
