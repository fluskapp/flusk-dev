/**
 * What "search across every project" returns. Frozen shape: src/find/*
 * produces it, /api/find serves it, and `ah find` and the webview render it.
 *
 * Matches are grouped BY FILE rather than served flat because that is how the
 * result is read — a file header with its lines under it — and because the
 * caps are stated in both units ("200 matches across at most 50 files").
 */

/** One matching line. `ranges` are CHARACTER offsets into `text`. */
export interface FindMatch {
	/** Absolute path of the file the line is in. */
	path: string;
	/** Project directory name the file belongs to (display and filtering). */
	project: string;
	/** 1-based line number. */
	line: number;
	/** The line, newline stripped, capped for transport. */
	text: string;
	/** [start, end) spans to highlight inside `text`, in characters. */
	ranges: [number, number][];
}

export interface FindFile {
	path: string;
	project: string;
	matches: FindMatch[];
}

export interface FindResult {
	files: FindFile[];
	/** Matches actually returned — never the true corpus total. */
	total: number;
	/** True when a bound (matches, files, time) cut the search short. */
	truncated: boolean;
	tookMs: number;
	/**
	 * Why the answer is not the whole answer, in a sentence a human can read:
	 * a bound that was hit, a project name that matches nothing, a missing or
	 * failing ripgrep. Silently returning a short list is a lie about what
	 * was searched, so every degraded path sets this.
	 */
	note?: string;
}

export interface FindQuery {
	q: string;
	/** Restrict to one configured project by directory name. */
	project?: string;
	/** ripgrep `-g` file filter, e.g. "*.ts". */
	glob?: string;
	/** false (default) searches for the literal string. */
	regex?: boolean;
	/** false (default) is case-insensitive. */
	caseSensitive?: boolean;
	limit?: number;
}
