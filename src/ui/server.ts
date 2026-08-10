import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { loadConfig } from "../config/config.js";
import { createServer, type Server, type ServerResponse } from "node:http";
import { join, resolve } from "node:path";
import { ahHome } from "../session/paths.js";
import { loadSessionDetail } from "./detail.js";
import { expandHome, resolveJournalDirs, scanJournals } from "./journal-scan.js";
import { buildMemoryView } from "./memory-view.js";
import { renderPage } from "./page.js";
import { scanSessions, sessionsRoot } from "./scan.js";

const KEY_RE = /^[a-z0-9-]+\/[A-Za-z0-9._-]+\.jsonl$/;

export interface UiServer {
	server: Server;
	url: string;
	close(): Promise<void>;
}

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

/** null when the key is malformed or escapes the sessions root. */
function keyToPath(key: string | null): string | null {
	if (key === null || !KEY_RE.test(key)) return null;
	const root = resolve(sessionsRoot());
	const path = resolve(join(root, key));
	return path.startsWith(root + "/") ? path : null;
}

function handle(
	method: string,
	pathname: string,
	key: string | null,
	repo: string | null,
	res: ServerResponse,
): void {
	if (method === "GET" && pathname === "/") {
		res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
		res.end(renderPage(ahHome()));
		return;
	}
	if (method === "GET" && pathname === "/api/sessions") {
		json(res, 200, scanSessions());
		return;
	}
	if (method === "GET" && pathname === "/api/session") {
		const path = keyToPath(key);
		if (path === null) {
			json(res, 400, { error: "bad session key" });
			return;
		}
		json(res, 200, { ...loadSessionDetail(path), path });
		return;
	}
	if (method === "GET" && pathname === "/api/journals") {
		json(res, 200, scanJournals(loadConfig(process.cwd()).ui.harnessDirs));
		return;
	}
	if (method === "GET" && pathname === "/api/journal") {
		// Only files inside a configured journal directory are readable.
		const target = repo === null ? "" : resolve(expandHome(repo));
		const dirs = resolveJournalDirs(loadConfig(process.cwd()).ui.harnessDirs).map((d) =>
			resolve(d),
		);
		if (target === "" || !dirs.some((d) => target.startsWith(`${d}/`))) {
			json(res, 400, { error: "not a configured journal path" });
			return;
		}
		try {
			res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
			res.end(readFileSync(target, "utf8"));
		} catch (e) {
			json(res, 404, { error: e instanceof Error ? e.message : String(e) });
		}
		return;
	}
	if (method === "GET" && pathname === "/api/memory") {
		// `repo` comes from a session the dashboard already listed, so it is a
		// path ah itself recorded — but resolve it before use regardless.
		if (repo === null || !repo.startsWith("/")) {
			json(res, 400, { error: "repo must be an absolute path" });
			return;
		}
		void buildMemoryView(resolve(repo)).then(
			(view) => json(res, 200, view),
			(e: unknown) => json(res, 500, { error: e instanceof Error ? e.message : String(e) }),
		);
		return;
	}
	if (method === "POST" && pathname === "/api/reveal") {
		const path = keyToPath(key);
		if (path === null) {
			json(res, 400, { error: "bad session key" });
			return;
		}
		if (process.platform !== "darwin") {
			json(res, 501, { error: "reveal is macOS-only" });
			return;
		}
		spawn("open", ["-R", path], { stdio: "ignore", detached: true }).unref();
		json(res, 200, { ok: true });
		return;
	}
	json(res, 404, { error: "not found" });
}

/** Loopback-only dashboard server. port 0 = pick a free port. */
export function startUiServer(port: number): Promise<UiServer> {
	const server = createServer((req, res) => {
		const url = new URL(req.url ?? "/", "http://localhost");
		try {
			handle(
				req.method ?? "GET",
				url.pathname,
				url.searchParams.get("k"),
				url.searchParams.get("repo"),
				res,
			);
		} catch (e) {
			json(res, 500, { error: e instanceof Error ? e.message : String(e) });
		}
	});
	return new Promise((resolveP, reject) => {
		server.once("error", reject);
		server.listen(port, "127.0.0.1", () => {
			const addr = server.address();
			const actual = typeof addr === "object" && addr !== null ? addr.port : port;
			resolveP({
				server,
				url: `http://127.0.0.1:${actual}`,
				close: () =>
					new Promise((r) => {
						server.close(() => r());
						// keep-alive sockets would hold close() open forever
						server.closeAllConnections();
					}),
			});
		});
	});
}
