/**
 * `ah find <query>` — ripgrep across every configured project, in one list.
 *
 * Grouped by file, because that is the unit you act on: a path header you can
 * copy, then its lines under it. The matched span is painted from the ranges
 * the search already computed, so the reason a line is here is visible without
 * re-reading the query — and the footer always states the totals and whether a
 * bound cut the search short, since a truncated list that looks complete is
 * the one failure mode of a search tool that matters.
 */
import { homedir } from "node:os";
import { styleText } from "node:util";
import { loadConfig } from "../config/config.js";
import { find } from "../find/ripgrep.js";
import type { FindQuery, FindResult } from "../find/types.js";

export interface FindArgs {
	project?: string | undefined;
	glob?: string | undefined;
	regex?: boolean | undefined;
	case?: boolean | undefined;
	limit?: string | undefined;
	out?: NodeJS.WritableStream;
}

type Paint = (style: "dim" | "cyan" | "bold", s: string) => string;

/** `~` back in, so a header is short enough to read and still pasteable. */
function short(path: string): string {
	const home = homedir();
	return path === home || path.startsWith(`${home}/`) ? `~${path.slice(home.length)}` : path;
}

/** Drops leading whitespace and moves the highlight ranges with it. */
function deindent(text: string, ranges: [number, number][]): [string, [number, number][]] {
	const cut = text.length - text.trimStart().length;
	if (cut === 0) return [text, ranges];
	const moved = ranges.map(([a, b]): [number, number] => [
		Math.max(0, a - cut),
		Math.max(0, b - cut),
	]);
	return [text.slice(cut), moved];
}

/** Paints [start, end) spans. Offsets are the same units String.slice uses. */
export function paintRanges(
	text: string,
	ranges: [number, number][],
	paint: (s: string) => string,
): string {
	let out = "";
	let at = 0;
	for (const [from, to] of ranges) {
		if (from < at || to > text.length) continue;
		out += text.slice(at, from) + paint(text.slice(from, to));
		at = to;
	}
	return out + text.slice(at);
}

function render(result: FindResult, paint: Paint, out: NodeJS.WritableStream): void {
	const width = Math.max(
		...result.files.flatMap((f) => f.matches.map((m) => String(m.line).length)),
		1,
	);
	for (const file of result.files) {
		out.write(`${paint("bold", short(file.path))} ${paint("dim", `(${file.project})`)}\n`);
		for (const m of file.matches) {
			const [text, ranges] = deindent(m.text.trimEnd(), m.ranges);
			const no = paint("dim", `${String(m.line).padStart(width)}: `);
			out.write(`  ${no}${paintRanges(text, ranges, (s) => paint("cyan", s))}\n`);
		}
		out.write("\n");
	}
}

/** The footer. Never omitted: it is where "this is not everything" is said. */
export function footer(result: FindResult): string {
	const head = `${result.total} match${result.total === 1 ? "" : "es"} in ${result.files.length} file${
		result.files.length === 1 ? "" : "s"
	} · ${result.tookMs}ms`;
	const why = result.note === undefined ? "" : ` · ${result.note}`;
	return result.truncated ? `${head} · TRUNCATED${why}\n` : `${head}${why}\n`;
}

/** `ah find <query> [--project p] [--glob g] [--regex] [--case] [--limit n]`. */
export async function findCmd(query: string, args: FindArgs = {}): Promise<number> {
	const out = args.out ?? process.stdout;
	// `ah find … | head` closes the pipe mid-write; the reader's choice.
	out.on("error", () => {});
	const limit = args.limit === undefined ? undefined : Number(args.limit);
	if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
		out.write("ah: --limit must be a positive integer\n");
		return 1;
	}
	const q: FindQuery = {
		q: query,
		...(args.project !== undefined ? { project: args.project } : {}),
		...(args.glob !== undefined ? { glob: args.glob } : {}),
		regex: args.regex === true,
		caseSensitive: args.case === true,
		...(limit !== undefined ? { limit } : {}),
	};
	const result = await find(loadConfig(process.cwd()), q);
	const tty = Boolean((out as { isTTY?: boolean }).isTTY);
	const paint: Paint = (style, s) => (tty ? styleText(style, s) : s);
	if (result.total === 0) {
		const why = result.note === undefined ? "" : ` (${result.note})`;
		out.write(`no matches for "${query}"${why}\n`);
		return 0;
	}
	render(result, paint, out);
	out.write(paint("dim", footer(result)));
	return 0;
}
