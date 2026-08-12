/**
 * Dev/verify harness: mounts the built Start handler (dist-app/server) plus
 * the client assets (dist-app/client) on a plain node http server. The same
 * mounting Electron performs in Phase 4 — the app never self-listens.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import { extname, join, normalize } from "node:path";
import server from "../dist-app/server/server.js";

const CLIENT = new URL("../dist-app/client", import.meta.url).pathname;
const MIME = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".json": "application/json", ".map": "application/json" };

const srv = http.createServer(async (req, res) => {
	const url = new URL(req.url ?? "/", "http://127.0.0.1");
	const file = normalize(join(CLIENT, url.pathname));
	if (file.startsWith(CLIENT) && existsSync(file) && statSync(file).isFile()) {
		res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
		createReadStream(file).pipe(res);
		return;
	}
	const body = req.method === "GET" || req.method === "HEAD" ? undefined : req;
	const request = new Request(`http://127.0.0.1:${srv.address().port}${req.url}`, {
		method: req.method,
		headers: req.headers,
		...(body ? { body, duplex: "half" } : {}),
	});
	const response = await server.fetch(request);
	res.writeHead(response.status, Object.fromEntries(response.headers));
	if (response.body) {
		for await (const chunk of response.body) res.write(chunk);
	}
	res.end();
});
const port = Number(process.env.PORT ?? 0);
srv.listen(port, "127.0.0.1", () => {
	process.stdout.write(`serving on http://127.0.0.1:${srv.address().port}\n`);
});
