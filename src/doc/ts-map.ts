/**
 * The 0-based ↔ 1-based border, in one place.
 *
 * TypeScript speaks flat character offsets and 0-based line/character; the doc
 * contract (types.ts) is 1-based line/col everywhere. Every conversion in this
 * feature goes through these two functions, because a `+1` scattered across a
 * provider is how a lookup ends up answering about the character next door.
 */
import type { SourceLoc } from "./types.js";

type SourceFile = import("typescript").SourceFile;
type TextSpan = import("typescript").TextSpan;

/**
 * The offset of 1-based `line`/`col` in `sf`, or null when that position is
 * outside the file or past the end of its line — a click in the gutter is not
 * an error, it is simply not a symbol.
 */
export function offsetAt(sf: SourceFile, line: number, col: number): number | null {
	if (!Number.isInteger(line) || !Number.isInteger(col) || line < 1 || col < 1) return null;
	const starts = sf.getLineStarts();
	if (line > starts.length) return null;
	const start = starts[line - 1] ?? 0;
	const next = line < starts.length ? (starts[line] ?? sf.text.length) : sf.text.length;
	const pos = start + col - 1;
	return pos < next ? pos : null;
}

/** A TypeScript span in `file` as a 1-based SourceLoc; null if unreadable. */
export function spanLoc(
	program: import("typescript").Program,
	file: string,
	span: TextSpan,
): SourceLoc | null {
	const sf = program.getSourceFile(file);
	if (sf === undefined) return null;
	return locIn(sf, span);
}

export function locIn(sf: SourceFile, span: TextSpan): SourceLoc {
	const a = sf.getLineAndCharacterOfPosition(span.start);
	const b = sf.getLineAndCharacterOfPosition(span.start + span.length);
	return {
		file: sf.fileName,
		line: a.line + 1,
		col: a.character + 1,
		endLine: b.line + 1,
		endCol: b.character + 1,
	};
}

/** 1-based line a flat offset falls on. */
export function lineAt(sf: SourceFile, offset: number): number {
	return sf.getLineAndCharacterOfPosition(offset).line + 1;
}
