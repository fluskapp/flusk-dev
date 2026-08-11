/**
 * Who is allowed to drive the dashboard.
 *
 * Binding to 127.0.0.1 stopped being sufficient the moment this server could
 * spawn agent CLIs and reach the network: a loopback port is reachable from
 * every page the user has open, and any attacker-controlled hostname can be
 * pointed at 127.0.0.1 (DNS rebinding). Two header checks close both doors:
 *
 *  - Host must name the loopback interface (and this server's port), so a
 *    rebound `evil.com` request is refused even though it arrived on the
 *    right socket.
 *  - Origin, WHEN PRESENT, must be this server's own. Browsers always attach
 *    it to cross-origin requests and to every POST, so this is what stops a
 *    random tab from POSTing /api/chat. Absent Origin (curl, and the
 *    dashboard's own GETs) is allowed — there is no browser to lie about it.
 *  - Sec-Fetch-Site, WHEN PRESENT, must not be `cross-site`. This is the one
 *    that covers navigations and subresource loads, which carry no Origin at
 *    all: framing the dashboard, or pointing an <img>/<script> at it, arrives
 *    with `sec-fetch-site: cross-site` and nothing else to object to. Every
 *    browser that can make such a request sends the header; curl sends none,
 *    so non-browser use is untouched.
 */
import type { IncomingMessage } from "node:http";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Split "host:port". An IPv6 literal keeps its brackets and its colons. */
export function splitHost(host: string): { name: string; port: string } {
	if (host.endsWith("]")) return { name: host, port: "" };
	const i = host.lastIndexOf(":");
	return i === -1 ? { name: host, port: "" } : { name: host.slice(0, i), port: host.slice(i + 1) };
}

/** Every spelling of "this server" a browser may put in an Origin header. */
export function allowedOrigins(port: number): string[] {
	return ["localhost", "127.0.0.1", "[::1]"].map((h) => `http://${h}:${port}`);
}

/** null when the request may proceed; otherwise the reason for a 403. */
export function denyReason(req: IncomingMessage, port: number): string | null {
	const host = req.headers.host ?? "";
	const { name, port: hostPort } = splitHost(host);
	if (!LOOPBACK.has(name.toLowerCase())) {
		return `refused: Host must be loopback, got ${host === "" ? "(absent)" : host}`;
	}
	if (hostPort !== "" && hostPort !== String(port)) {
		return `refused: Host port ${hostPort} is not this server (${port})`;
	}
	// A user opening the dashboard from a link, a bookmark, or another page is
	// a cross-site TOP-LEVEL NAVIGATION, and refusing those makes the page
	// unreachable in a real browser. It is also harmless: a hostile page can
	// send the user here, but it cannot read the response (no CORS headers are
	// ever sent) and cannot act, because everything state-changing is a POST
	// and every POST still faces the checks below.
	if (isTopLevelNavigation(req)) return null;

	const origin = req.headers.origin;
	if (origin !== undefined && !allowedOrigins(port).includes(origin.toLowerCase())) {
		return `refused: cross-origin request from ${origin}`;
	}
	const site = req.headers["sec-fetch-site"];
	if (typeof site === "string" && site.toLowerCase() === "cross-site") {
		return "refused: cross-site request";
	}
	return null;
}

/** A GET the browser is performing to put a document in the address bar. */
export function isTopLevelNavigation(req: IncomingMessage): boolean {
	const h = req.headers;
	const get = (req.method ?? "GET").toUpperCase() === "GET";
	const mode = typeof h["sec-fetch-mode"] === "string" ? h["sec-fetch-mode"] : "";
	const dest = typeof h["sec-fetch-dest"] === "string" ? h["sec-fetch-dest"] : "";
	return get && mode === "navigate" && dest === "document";
}

/**
 * Response headers for the dashboard document itself. The page can spawn
 * agent CLIs, so it must not be frameable: a hostile page that could iframe
 * it at the fixed default port would overlay its own controls on top of
 * "Reveal in Finder" and the chat Send button.
 */
export const PAGE_HEADERS: Record<string, string> = {
	"content-type": "text/html; charset=utf-8",
	"x-frame-options": "DENY",
	"content-security-policy": [
		"default-src 'self'",
		"script-src 'unsafe-inline'",
		"style-src 'unsafe-inline'",
		"img-src 'self' data:",
		"connect-src 'self'",
		"frame-ancestors 'none'",
		"base-uri 'none'",
		"form-action 'none'",
	].join("; "),
	"referrer-policy": "no-referrer",
};
