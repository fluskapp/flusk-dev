/**
 * Search endpoints: content across every configured project (`/api/find`,
 * ripgrep) and the Go-to-File list (`/api/files`, fuzzy path match).
 *
 * Both are GETs behind the loopback guard server.ts already runs, and neither
 * takes a path from the caller — only a project NAME, which src/find resolves
 * against the configured roots. Config is re-read per request, the same choice
 * api-content.ts and api-projects.ts make, so editing ~/.ah/config.json shows
 * up without restarting `ah ui`.
 */
import type { ServerResponse } from "node:http";
import { loadConfig } from "../config/config.js";
import { fuzzyPath, listFiles, projectFor, searchRoots } from "../find/files.js";
import { find } from "../find/ripgrep.js";
import type { FindQuery } from "../find/types.js";

/** Results one Go-to-File request returns; the palette shows far fewer. */
const FILE_RESULTS = 50;

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** A query flag: present and not an explicit "0"/"false" means on. */
function flag(raw: string | null): boolean {
	if (raw === null) return false;
	const v = raw.toLowerCase();
	return v !== "0" && v !== "false" && v !== "no";
}

function count(raw: string | null): number | undefined {
	if (raw === null || raw.trim() === "") return undefined;
	const n = Number(raw);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function str(raw: string | null): string | undefined {
	return raw === null || raw === "" ? undefined : raw;
}

export function findQuery(q: URLSearchParams): FindQuery {
	const project = str(q.get("project"));
	const glob = str(q.get("glob"));
	const limit = count(q.get("limit"));
	return {
		q: q.get("q") ?? "",
		...(project !== undefined ? { project } : {}),
		...(glob !== undefined ? { glob } : {}),
		regex: flag(q.get("regex")),
		caseSensitive: flag(q.get("case")),
		...(limit !== undefined ? { limit } : {}),
	};
}

/** Returns true when it handled the route. */
export function handleFind(
	method: string,
	pathname: string,
	query: URLSearchParams,
	res: ServerResponse,
): boolean {
	if (method !== "GET") return false;
	if (pathname === "/api/find") {
		void content(query, res);
		return true;
	}
	if (pathname === "/api/files") {
		void paths(query, res);
		return true;
	}
	return false;
}

/**
 * The listing walk is a subprocess per root, so it is awaited rather than
 * blocked on: `execFileSync` here froze the whole server — every tab, the SSE
 * chat stream and the status polls — for the length of the walk.
 */
async function paths(query: URLSearchParams, res: ServerResponse): Promise<void> {
	const cfg = loadConfig(process.cwd());
	const project = str(query.get("project"));
	const roots = searchRoots(cfg, project);
	const limit = count(query.get("limit")) ?? FILE_RESULTS;
	const files = await listFiles(cfg, { ...(project !== undefined ? { project } : {}) });
	json(
		res,
		200,
		fuzzyPath(files, query.get("q") ?? "", limit).map((path) => ({
			path,
			project: projectFor(roots, path),
		})),
	);
}

/**
 * A client that hung up is not owed the rest of the scan: the abort kills the
 * rg process group rather than leaving it walking every project directory.
 */
async function content(query: URLSearchParams, res: ServerResponse): Promise<void> {
	const abort = new AbortController();
	res.on("close", () => abort.abort());
	try {
		json(res, 200, await find(loadConfig(process.cwd()), findQuery(query), abort.signal));
	} catch (e) {
		json(res, 500, { error: e instanceof Error ? e.message : String(e) });
	}
}
