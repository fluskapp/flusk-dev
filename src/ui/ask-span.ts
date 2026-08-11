/**
 * The "relevant span" half of an attachment: the lines of the file the
 * question is actually about, with their real line numbers.
 *
 * WHY A SPAN AND NOT THE FILE. A whole module blows the context window on the
 * 900 lines nobody asked about, and an answer built from it cites the wrong
 * function. WHY LINE NUMBERS. Without them a model answers about "line 12" of
 * the excerpt while the reader is looking at line 412 of the file, and neither
 * of them can tell.
 *
 * Bounded on both sides: a symbol's own declaration when the engine gave one,
 * otherwise a window around the caret, and never more than MAX_SPAN_LINES.
 * Nothing here throws — an unreadable file yields null and the caller says so,
 * because a missing block with a sentence beats a 500 on the whole panel.
 */
import { readFile, stat } from "node:fs/promises";
import { MAX_SOURCE_BYTES } from "./api-doc-view.js";

/** Lines either side of the caret when only a point is known. */
export const SPAN_PAD = 18;
/** Hard cap; a "span" longer than this is just the file again. */
export const MAX_SPAN_LINES = 160;

export interface SpanRequest {
	file: string;
	/** 1-based. */
	line: number;
	/** 1-based, inclusive; absent when only a point is known. */
	endLine?: number;
}

export interface FileSpan {
	from: number;
	to: number;
	/** `<n>| <source>` rows, so a cited line number is the file's own. */
	text: string;
	/** True when the declaration ran past MAX_SPAN_LINES and was cut. */
	truncated: boolean;
}

/** The span, or null when the file cannot be read or is past the size cap. */
export async function readSpan(req: SpanRequest): Promise<FileSpan | null> {
	let lines: string[];
	try {
		if ((await stat(req.file)).size > MAX_SOURCE_BYTES) return null;
		lines = (await readFile(req.file, "utf8")).split("\n");
	} catch {
		return null;
	}
	if (lines.length === 0) return null;
	const hasEnd = req.endLine !== undefined && req.endLine >= req.line;
	const from = clamp(hasEnd ? req.line : req.line - SPAN_PAD, lines.length);
	const wanted = clamp(hasEnd ? (req.endLine as number) : req.line + SPAN_PAD, lines.length);
	const to = Math.min(wanted, from + MAX_SPAN_LINES - 1);
	const rows: string[] = [];
	for (let n = from; n <= to; n++) rows.push(`${n}| ${lines[n - 1] ?? ""}`);
	return { from, to, text: rows.join("\n"), truncated: to < wanted };
}

function clamp(n: number, max: number): number {
	return Math.max(1, Math.min(Math.round(n) || 1, max));
}
