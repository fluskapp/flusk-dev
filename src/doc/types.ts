/**
 * The documentation lookup contract — what a "show me this symbol" answer is,
 * independent of who computed it. Frozen: the TypeScript engine, the LSP
 * client and the workbench UI all build against this file, so changing a
 * field here is an architecture decision, not a drive-by.
 *
 * ONE-BASED, EVERYWHERE. `line` and `col` in this file are 1-based (the first
 * character of a file is line 1, col 1), because that is what an editor gutter
 * shows and what the workbench sends back on a click. The TypeScript API
 * speaks 0-based line/character and flat byte offsets, and LSP speaks 0-based
 * line/character too; both are converted at the provider boundary. Getting
 * this wrong does not throw — it silently answers about the character next
 * door, which is the single most likely bug in this feature.
 */

/** A span in a file. `endLine`/`endCol` are absent when only a point is known. */
export interface SourceLoc {
	file: string;
	/** 1-based. */
	line: number;
	/** 1-based. */
	col: number;
	/** 1-based line the span ends on. */
	endLine?: number;
	/** 1-based, exclusive: a 3-character name at col 5 ends at col 8. */
	endCol?: number;
}

/** One JSDoc/docstring tag: `@param x the thing` → { name: "param", text: … }. */
export interface DocTag {
	name: string;
	text: string;
}

/**
 * Everything the doc view shows for one symbol: the IntelliJ half (signature,
 * prose, tags, definition, usages) that the history half is joined onto by
 * `defined.file` and `name`.
 */
export interface SymbolDoc {
	name: string;
	/** Engine-native kind: "function", "interface", "method", "var"… */
	kind: string;
	/** Rendered declaration, e.g. `function greet(who: string): string`. */
	signature: string;
	/** Prose documentation with tags stripped out into `tags`. */
	docs: string;
	tags: DocTag[];
	defined: SourceLoc | null;
	/** Capped; `referenceCount` always carries the true total. */
	references: SourceLoc[];
	referenceCount: number;
	provider: "typescript" | "lsp";
	/** True when `references` was cut short by the cap. */
	truncated?: boolean;
}

/** One row of a file's structure view; `depth` 0 is top level. */
export interface OutlineItem {
	name: string;
	kind: string;
	/** 1-based line the declaration starts on. */
	line: number;
	depth: number;
}

/**
 * A documentation engine. Implementations never throw: an unsupported file, a
 * syntax error or a position with no symbol is `null` / `[]`, because a doc
 * popup that explodes is worse than one that says nothing.
 */
export interface DocProvider {
	id: string;
	supports(file: string): boolean;
	/** `line`/`col` are 1-based. */
	docAt(file: string, line: number, col: number): Promise<SymbolDoc | null>;
	outline(file: string): Promise<OutlineItem[]>;
	dispose(): void;
}
