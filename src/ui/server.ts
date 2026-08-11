/**
 * The dashboard server: a loopback listener, the request guard, and routing.
 * Every endpoint's body lives in an api-*.ts module beside this one.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { ahHome } from "../session/paths.js";
import { handleChat, liveChats } from "./api-chat.js";
import { handleContent } from "./api-content.js";
import { disposeDocRegistries, handleDoc } from "./api-doc.js";
import { handleFileBody } from "./api-file.js";
import { handleFind } from "./api-find.js";
import { denyReason, PAGE_HEADERS } from "./api-guard.js";
import { handleHistory } from "./api-history.js";
import { handleProjects } from "./api-projects.js";
import { handleRender } from "./api-render.js";
import { handleSessions } from "./api-sessions.js";
import { renderPage } from "./page.js";

export interface UiServer {
	server: Server;
	url: string;
	close(): Promise<void>;
}

function json(res: ServerResponse, status: number, body: unknown): void {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(body));
}

function handle(req: IncomingMessage, res: ServerResponse, port: number): void {
	// Host/Origin first: nothing below should run for a request that is not
	// this machine's own browser talking to this server (see api-guard.ts).
	const deny = denyReason(req, port);
	if (deny !== null) {
		json(res, 403, { error: deny });
		return;
	}
	const url = new URL(req.url ?? "/", "http://localhost");
	const method = req.method ?? "GET";
	const path = url.pathname;
	const repo = url.searchParams.get("repo");
	if (method === "GET" && path === "/") {
		res.writeHead(200, PAGE_HEADERS);
		res.end(renderPage(ahHome()));
		return;
	}
	if (handleFind(method, path, url.searchParams, res)) return;
	if (handleFileBody(method, path, repo, res)) return;
	if (handleHistory(method, path, url.searchParams, res)) return;
	if (handleContent(method, path, repo, res)) return;
	if (handleDoc(method, path, url.searchParams, res)) return;
	if (handleProjects(method, path, url.searchParams, res)) return;
	if (handleRender(method, path, req, res)) return;
	if (handleChat(method, path, req, res)) return;
	if (handleSessions(method, path, url.searchParams.get("k"), repo, res)) return;
	json(res, 404, { error: "not found" });
}

/** Loopback-only dashboard server. port 0 = pick a free port. */
export function startUiServer(port: number): Promise<UiServer> {
	// The guard compares the Host header against the port actually bound, which
	// is only known once listen() calls back — hence the mutable capture.
	let bound = port;
	const server = createServer((req, res) => {
		try {
			handle(req, res, bound);
		} catch (e) {
			json(res, 500, { error: e instanceof Error ? e.message : String(e) });
		}
	});
	return new Promise((resolveP, reject) => {
		server.once("error", reject);
		server.listen(port, "127.0.0.1", () => {
			const addr = server.address();
			bound = typeof addr === "object" && addr !== null ? addr.port : port;
			resolveP({
				server,
				url: `http://127.0.0.1:${bound}`,
				close: () =>
					new Promise((r) => {
						// Streaming chats first: their CLI children are detached, so
						// nothing else will ever end them (see api-chat.ts liveChats).
						for (const chat of [...liveChats]) chat.abort();
						liveChats.clear();
						// Then the doc engines: a language server ah spawned is detached
						// too, and its ref'd stdio pipes outlived the dashboard entirely.
						disposeDocRegistries();
						server.close(() => r());
						// keep-alive sockets would hold close() open forever
						server.closeAllConnections();
					}),
			});
		});
	});
}
