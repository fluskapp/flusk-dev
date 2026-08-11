/**
 * Session endpoints: the run list, one run's transcript, the memory view, and
 * "reveal in Finder". Split out of server.ts so the server file is only the
 * security guard plus routing.
 *
 * Every path a request can name is derived from a key the scanner already
 * published, and re-validated here: the sessions root is the only directory
 * these routes will read.
 */
import { spawn } from "node:child_process";
import type { ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import { loadConfig } from "../config/config.js";
import { scanArtifacts } from "./artifact-scan.js";
import { loadSessionDetail } from "./detail.js";
import { expandHome, scanJournals } from "./journal-scan.js";
import { buildMemoryView } from "./memory-view.js";
import { projectRoots } from "./project-scan.js";
import { scanSessions, sessionsRoot } from "./scan.js";

const KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9._-]+\.jsonl$/;

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** null when the key is malformed or escapes the sessions root. */
export function keyToPath(key: string | null): string | null {
	if (key === null || !KEY_RE.test(key)) return null;
	const root = resolve(sessionsRoot());
	const path = resolve(join(root, key));
	return path.startsWith(`${root}/`) ? path : null;
}

/**
 * A file the dashboard is allowed to hand to the Finder.
 *
 * Reveal spawns `open -R` on whatever it is given, so the set of acceptable
 * paths has to be closed, not merely checked for shape. Exact membership of
 * what the scanners ALREADY published is the same rule /api/artifact uses, and
 * unlike a prefix test it cannot be walked out of by a symlink that resolves
 * back inside the root.
 */
export function revealablePath(target: string | null): string | null {
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
	repo: string | null,
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
	if (method === "GET" && pathname === "/api/memory") {
		// buildMemoryView loads that directory's config, and a config decides
		// which abagraph server the user's memory.apiKey is sent to. So `repo`
		// is checked exactly the way /api/chat checks `cwd`: it must be one of
		// the project roots the scanner already published, never any absolute
		// path the caller fancies.
		const path = repo === null ? null : resolve(repo);
		if (path === null || !projectRoots(loadConfig(process.cwd())).includes(path)) {
			json(res, 400, { error: "repo must be a known project path" });
			return true;
		}
		void buildMemoryView(path).then(
			(view) => json(res, 200, view),
			(e: unknown) => json(res, 500, { error: e instanceof Error ? e.message : String(e) }),
		);
		return true;
	}
	if (method === "POST" && pathname === "/api/reveal") {
		// Two callers: a run transcript names a session KEY, a journal or a
		// document names its PATH. Both resolve through a closed set.
		const path = key === null ? revealablePath(repo) : keyToPath(key);
		if (path === null) json(res, 400, { error: "not a revealable file" });
		else if (process.platform !== "darwin") json(res, 501, { error: "reveal is macOS-only" });
		else {
			spawn("open", ["-R", path], { stdio: "ignore", detached: true }).unref();
			json(res, 200, { ok: true });
		}
		return true;
	}
	return false;
}
