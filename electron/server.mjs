/**
 * The app's HTTP server: Electron owns the loopback listener, Start does not
 * self-listen. Reuses the legacy server's exact shape — `denyReason()` in
 * front of everything, and the careful close() that aborts live chats before
 * disposing LSP registries and calling closeAllConnections(), because a
 * detached `claude -p` or language server would otherwise outlive the window
 * (and keep billing).
 *
 * Two additions for the desktop world:
 *  - a per-launch nonce: the guard already blocks cross-origin browsers, but
 *    another LOCAL app could still drive the port. The renderer sends
 *    x-flusk-nonce on every request (injected via session headers in
 *    main.mjs); anything without it is refused.
 *  - static client assets served beside the SSR handler, since there is no
 *    Vite dev server in a packaged app.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const MIME = {
	".js": "text/javascript",
	".css": "text/css",
	".html": "text/html",
	".svg": "image/svg+xml",
	".json": "application/json",
	".map": "application/json",
	".woff2": "font/woff2",
};

/** Mirrors src/ui/api-guard.ts denyReason for the Electron context. */
function denyReason(req, port, nonce) {
	const host = req.headers.host ?? "";
	const name = host.endsWith("]") ? host : host.slice(0, host.lastIndexOf(":"));
	if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(name.toLowerCase())) {
		return `refused: Host must be loopback, got ${host || "(absent)"}`;
	}
	const hostPort = host.includes(":") && !host.endsWith("]") ? host.slice(host.lastIndexOf(":") + 1) : "";
	if (hostPort !== "" && hostPort !== String(port)) {
		return `refused: Host port ${hostPort} is not this server (${port})`;
	}
	if (req.headers["x-flusk-nonce"] !== nonce) return "refused: missing launch nonce";
	return null;
}

/**
 * @param {{ handler: { fetch(req: Request): Promise<Response> }, clientDir: string, nonce: string, onClose?: () => void }} opts
 */
export function startAppServer(opts) {
	let bound = 0;
	const server = createServer(async (req, res) => {
		try {
			const deny = denyReason(req, bound, opts.nonce);
			if (deny !== null) {
				res.writeHead(403, { "content-type": "application/json" });
				res.end(JSON.stringify({ error: deny }));
				return;
			}
			const url = new URL(req.url ?? "/", "http://127.0.0.1");
			const file = normalize(join(opts.clientDir, url.pathname));
			if (file.startsWith(opts.clientDir) && existsSync(file) && statSync(file).isFile()) {
				res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
				createReadStream(file).pipe(res);
				return;
			}
			const body = req.method === "GET" || req.method === "HEAD" ? undefined : req;
			const request = new Request(`http://127.0.0.1:${bound}${req.url}`, {
				method: req.method,
				headers: req.headers,
				...(body ? { body, duplex: "half" } : {}),
			});
			const response = await opts.handler.fetch(request);
			res.writeHead(response.status, Object.fromEntries(response.headers));
			if (response.body) for await (const chunk of response.body) res.write(chunk);
			res.end();
		} catch (e) {
			res.writeHead(500, { "content-type": "application/json" });
			res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
		}
	});
	return new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			bound = server.address().port;
			resolve({
				url: `http://127.0.0.1:${bound}`,
				port: bound,
				close: () =>
					new Promise((r) => {
						// Engine teardown first (live chats, LSP registries) — the
						// callback is wired by main.mjs from the built server modules.
						opts.onClose?.();
						server.close(() => r());
						server.closeAllConnections();
					}),
			});
		});
	});
}
