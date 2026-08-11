/**
 * Content search across every configured project, over ripgrep's `--json`
 * stream. rg is spawned with an ARGV ARRAY and no shell, so a query is data:
 * there is nothing for `;` or a backtick in it to escape into.
 *
 * Two rules the rest of this file exists to keep:
 *
 *  - Only configured roots are searched. A request may NARROW them by project
 *    name; it can never name a path (see files.ts `searchRoots`), so `../` and
 *    an absolute path outside the config are simply not expressible.
 *  - Every bound is stated. Hitting the match cap, the file cap or the timeout
 *    sets `truncated` AND a readable `note`; a short list presented as the
 *    whole answer is a lie about what was searched.
 */
import type { AhConfig } from "../config/types.js";
import { projectFor, searchRoots } from "./files.js";
import { parseMatch, rgArgs, toMatch } from "./rg-parse.js";
import { runRg } from "./rg-spawn.js";
import type { FindMatch, FindQuery, FindResult } from "./types.js";

export const MAX_MATCHES = 200;
export const MAX_FILES = 50;

type Grouped = Map<string, FindMatch[]>;

function result(files: Grouped, started: number, truncated: boolean, note?: string): FindResult {
	const out = [...files].map(([path, matches]) => ({
		path,
		project: matches[0]?.project ?? "",
		matches,
	}));
	return {
		files: out,
		total: out.reduce((n, f) => n + f.matches.length, 0),
		truncated,
		tookMs: Date.now() - started,
		...(note !== undefined ? { note } : {}),
	};
}

/** Why nothing was searched, when the query names roots that do not exist. */
function noRoots(query: FindQuery): string {
	return query.project !== undefined && query.project !== ""
		? `no configured project named "${query.project}" — nothing was searched`
		: "no project directories are configured (ui.projectDirs)";
}

export async function find(
	cfg: AhConfig,
	query: FindQuery,
	signal?: AbortSignal,
): Promise<FindResult> {
	const started = Date.now();
	const files: Grouped = new Map();
	if (query.q.trim() === "") return result(files, started, false, "empty query");
	const roots = searchRoots(cfg, query.project);
	if (roots.length === 0) return result(files, started, false, noRoots(query));

	const limit = Math.max(1, Math.min(query.limit ?? MAX_MATCHES, MAX_MATCHES));
	let total = 0;
	let bound: string | null = null;
	let bad = 0;
	/** One JSON line in; true out means "stop, a bound was reached". */
	const take = (line: string): boolean => {
		const rec = parseMatch(line);
		if (rec === "bad") {
			bad++;
			return false;
		}
		if (rec === null) return false;
		const path = rec.path?.text ?? "";
		if (!files.has(path) && files.size >= MAX_FILES) {
			bound = `stopped at ${MAX_FILES} files`;
			return true;
		}
		const match = toMatch(rec, projectFor(roots, path));
		if (match === null) return false;
		const list = files.get(path);
		if (list === undefined) files.set(path, [match]);
		else list.push(match);
		total++;
		if (total >= limit) {
			bound = `stopped at ${limit} matches`;
			return true;
		}
		return false;
	};

	const failed = await runRg(
		rgArgs(
			query,
			roots.map((r) => r.path),
		),
		take,
		signal,
	);
	const note = [bound, failed, bad > 0 ? `${bad} unreadable ripgrep records skipped` : null]
		.filter((n): n is string => n !== null)
		.join("; ");
	return result(files, started, bound !== null || failed !== null, note === "" ? undefined : note);
}
