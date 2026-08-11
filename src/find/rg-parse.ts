/**
 * ripgrep's `--json` records, turned into `FindMatch`. Kept apart from the
 * spawning so the mapping — which is where the subtle bug lives — can be
 * tested without a subprocess.
 */
import { type RgSub, toRanges, windowFor } from "./rg-offsets.js";
import type { FindMatch, FindQuery } from "./types.js";

export type { RgSub } from "./rg-offsets.js";
export { MAX_LINE } from "./rg-offsets.js";

/** Marks a window that does not start at the beginning of the line. */
const ELLIPSIS = "…";

export interface RgMatch {
	path?: { text?: string };
	line_number?: number;
	lines?: { text?: string };
	submatches?: RgSub[];
}

/** The argv rg is spawned with — an array, never a shell string. */
export function rgArgs(query: FindQuery, roots: string[]): string[] {
	return [
		"--json",
		"--line-number",
		"--max-filesize=1M",
		"--max-columns=400",
		"--max-columns-preview",
		...(query.regex === true ? [] : ["-F"]),
		...(query.caseSensitive === true ? [] : ["-i"]),
		...(query.glob !== undefined && query.glob !== "" ? ["-g", query.glob] : []),
		"--",
		query.q,
		...roots,
	];
}

/**
 * One JSON line: the match record, `null` for any other record type (begin,
 * end, summary), `"bad"` when it did not parse. A malformed line is counted
 * and reported, never thrown — a single odd record must not lose the search.
 */
export function parseMatch(line: string): RgMatch | "bad" | null {
	let rec: { type?: string; data?: RgMatch };
	try {
		rec = JSON.parse(line) as { type?: string; data?: RgMatch };
	} catch {
		return "bad";
	}
	if (rec.type !== "match" || rec.data === undefined) return null;
	return rec.data;
}

/**
 * A match record → a FindMatch, or null when the record is unusable.
 *
 * The kept text is a WINDOW, not always the head of the line: a match past
 * character 400 used to be dropped from the highlight entirely, leaving a row
 * that showed 400 characters not containing the query — a false positive.
 */
export function toMatch(rec: RgMatch, project: string): FindMatch | null {
	const path = rec.path?.text;
	const raw = rec.lines?.text;
	if (path === undefined || raw === undefined || typeof rec.line_number !== "number") return null;
	const body = raw.replace(/\r?\n$/, "");
	const subs = rec.submatches ?? [];
	const window = windowFor(body, subs);
	const ranges = toRanges(body, subs, window);
	const lead = window.origin > 0 ? ELLIPSIS : "";
	return {
		path,
		project,
		line: rec.line_number,
		text: lead + body.slice(window.origin, window.origin + window.width),
		ranges: lead === "" ? ranges : ranges.map(([a, b]): [number, number] => [a + 1, b + 1]),
	};
}
