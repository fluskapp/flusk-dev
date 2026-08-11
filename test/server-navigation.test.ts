/**
 * Browser-navigation behaviour of the loopback guard, split from
 * server-security.test.ts to stay within the size standard.
 */
import { request } from "node:http";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";

let ui: UiServer;

beforeAll(async () => {
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
});

/**
 * Regression: the Sec-Fetch-Site guard refused the real browser. Opening the
 * dashboard from a link or another tab is a cross-site TOP-LEVEL NAVIGATION,
 * and blocking it made the page unreachable in Chrome while every curl-based
 * check still passed.
 *
 * This uses node:http directly, NOT fetch: undici rewrites Sec-Fetch-Mode to
 * "cors", so a fetch-based test cannot express a navigation at all — which is
 * exactly why the original verification missed this.
 */
function rawGet(
	url: string,
	headers: Record<string, string>,
	method = "GET",
): Promise<{ status: number; body: string }> {
	const u = new URL(url);
	return new Promise((resolve, reject) => {
		const req = request(
			{ hostname: u.hostname, port: u.port, path: u.pathname, method, headers },
			(res) => {
				let body = "";
				res.on("data", (c) => {
					body += c;
				});
				res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
			},
		);
		req.on("error", reject);
		req.end();
	});
}

const NAV = {
	"sec-fetch-site": "cross-site",
	"sec-fetch-mode": "navigate",
	"sec-fetch-dest": "document",
};

it("allows a cross-site top-level navigation", async () => {
	const nav = await rawGet(`${ui.url}/`, NAV);
	expect(nav.status).toBe(200);
	expect(nav.body).toContain("<title>ah</title>");
});

it("still blocks a cross-site data fetch", async () => {
	const xhr = await rawGet(`${ui.url}/api/projects`, {
		"sec-fetch-site": "cross-site",
		"sec-fetch-mode": "cors",
		"sec-fetch-dest": "empty",
	});
	expect(xhr.status).toBe(403);
});

it("does not let a navigation-shaped POST through", async () => {
	const post = await rawGet(`${ui.url}/api/chat`, { ...NAV, "content-type": "application/json" }, "POST");
	expect(post.status).toBe(403);
});
