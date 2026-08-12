/**
 * Session endpoints: the run list, one run's transcript, and "reveal in
 * Finder". Split out of server.ts so the server file is only the security
 * guard plus routing.
 *
 * Every path a request can name is derived from a key the scanner already
 * published, and re-validated here: the sessions root is the only directory
 * these routes will read.
 */
import { revealInFinder } from "./reveal.repository.js";
import type { ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import { loadConfig } from "../../platform/config/config.js";
import { scanArtifacts } from "./artifact-scan.repository.js";
import { loadSessionDetail } from "./detail.js";
import { expandHome, scanJournals } from "./journal-scan.repository.js";
import { scanSessions, sessionsRoot } from "./scan.repository.js";

const KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9._-]+\.jsonl$/;

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** null when the key is malformed or escapes the sessions root. */
function keyToPath(key: string | null): string | null {
	if (key === null || !KEY_RE.test(key)) return null;
	const root = resolve(sessionsRoot());
	const path = resolve(join(root, key));
	return path.startsWith(`${root}/`) ? path : null;
}

/**
 * A file the dashboard is allowed to hand to the Finder.
 *
 * Reveal spawns `open -R` on whatever it is given, so the set of acceptable
 * paths has to be CLOSED, not merely checked for shape. Exact membership of
 * what the scanners already published is the same rule /api/artifact uses,
 * and unlike a prefix test it cannot be walked out of by a symlink that
 * resolves back inside the root.
 */
function revealablePath(target: string | null): string | null {
	if (target === null || target === "") return null;
	const path = resolve(expandHome(target));
	const cfg = loadConfig(process.cwd());
	const indexed = [
		...scanJournals(cfg.ui.harnessDirs).map((j) => j.path),
		...scanArtifacts(cfg.ui.projectDirs).map((a) => a.path),
	];
	return indexed.includes(path) ? path : null;
}

/** Returns true when it handled the route. */
export function handleSessions(
	method: string,
	pathname: string,
	key: string | null,
	target: string | null,
	res: ServerResponse,
): boolean {
	if (method === "GET" && pathname === "/api/sessions") {
		json(res, 200, scanSessions());
		return true;
	}
	if (method === "GET" && pathname === "/api/session") {
		const path = keyToPath(key);
		if (path === null) json(res, 400, { error: "bad session key" });
		else json(res, 200, { ...loadSessionDetail(path), path });
		return true;
	}
	if (method === "POST" && pathname === "/api/reveal") {
		// Two callers: a run transcript names a session KEY, a journal or a
		// document names its PATH. Both resolve through a closed set.
		const path = key === null ? revealablePath(target) : keyToPath(key);
		if (path === null) json(res, 400, { error: "not a revealable file" });
		else if (process.platform !== "darwin") json(res, 501, { error: "reveal is macOS-only" });
		else {
			revealInFinder(path);
			json(res, 200, { ok: true });
		}
		return true;
	}
	return false;
}
