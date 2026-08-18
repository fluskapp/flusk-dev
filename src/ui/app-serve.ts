/**
 * The built React app, served headless — the same two-step shape as
 * electron/server.mjs: static client assets first, then every remaining
 * request through the dist-app SSR fetch handler. This is what makes
 * `flusk ui --server` (and the automatic no-Electron fallback) the SAME
 * product as the desktop app, with deep links that render instead of
 * 404ing. When dist-app has not been built, the caller falls back to the
 * legacy page.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebStream } from "node:stream/web";
import { fileURLToPath } from "node:url";
import { PAGE_HEADERS } from "./api-guard.js";

export interface AppHandler {
	fetch(req: Request): Promise<Response>;
}

const MIME: Record<string, string> = {
	".js": "text/javascript",
	".css": "text/css",
	".html": "text/html",
	".svg": "image/svg+xml",
	".json": "application/json",
	".map": "application/json",
	".woff2": "font/woff2",
};

/** dist-app sits beside dist/ at the package root (this file runs from dist/ui). */
const appRoot = (): string => join(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist-app");

let cached: AppHandler | null | undefined;

/** The SSR handler, imported once; null when the app has not been built. */
export async function loadAppHandler(): Promise<AppHandler | null> {
	if (cached !== undefined) return cached;
	const entry = join(appRoot(), "server", "server.js");
	cached = existsSync(entry) ? ((await import(entry)) as { default: AppHandler }).default : null;
	return cached;
}

/**
 * The legacy document's locks, retargeted at the built app: its scripts and
 * styles are same-origin FILES, so 'self' joins the inline grants the SSR
 * stream needs. The framing and base-uri defences stay word for word.
 */
const APP_CSP = PAGE_HEADERS["content-security-policy"]
	?.replace("script-src 'unsafe-inline'", "script-src 'self' 'unsafe-inline'")
	.replace("style-src 'unsafe-inline'", "style-src 'self' 'unsafe-inline'");

/** Serve one guarded request from dist-app: a client asset or the SSR handler. */
export async function serveApp(
	handler: AppHandler,
	req: IncomingMessage,
	res: ServerResponse,
	port: number,
): Promise<void> {
	const url = new URL(req.url ?? "/", "http://127.0.0.1");
	const clientDir = join(appRoot(), "client");
	const file = normalize(join(clientDir, url.pathname));
	if (file.startsWith(clientDir) && existsSync(file) && statSync(file).isFile()) {
		res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
		createReadStream(file).pipe(res);
		return;
	}
	const headers = new Headers();
	for (const [k, v] of Object.entries(req.headers)) {
		if (typeof v === "string") headers.set(k, v);
		else if (Array.isArray(v)) for (const one of v) headers.append(k, one);
	}
	const body = req.method === "GET" || req.method === "HEAD" ? undefined : req;
	const request = new Request(`http://127.0.0.1:${port}${req.url ?? "/"}`, {
		method: req.method,
		headers,
		...(body !== undefined
			? { body: Readable.toWeb(body) as unknown as ReadableStream, duplex: "half" }
			: {}),
	} as RequestInit);
	const response = await handler.fetch(request);
	const out = Object.fromEntries(response.headers);
	if ((out["content-type"] ?? "").startsWith("text/html")) {
		// The document can spawn agent CLIs; it keeps the legacy page's armor.
		out["x-frame-options"] = "DENY";
		if (APP_CSP !== undefined) out["content-security-policy"] = APP_CSP;
		out["referrer-policy"] = "no-referrer";
	}
	res.writeHead(response.status, out);
	if (response.body !== null) {
		Readable.fromWeb(response.body as unknown as NodeWebStream<Uint8Array>).pipe(res);
	} else {
		res.end();
	}
}
