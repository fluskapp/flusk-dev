/**
 * The headless door serves the SAME product as the desktop app: with
 * dist-app built, `flusk ui --server` answers "/" and every deep link with
 * the React app's SSR HTML — never the legacy page, never a JSON 404 — and
 * serves the client assets beside it (the electron/server.mjs shape). Skips
 * honestly when dist-app is absent, like app-ssr.test.ts.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { call } from "./api-http.js";
import { type Tree, tree } from "./project-fixture.js";

const built = existsSync(join(process.cwd(), "dist-app", "server", "server.js"));
const itApp = built ? it : it.skip;

let t: Tree;
let ui: UiServer;

beforeAll(async () => {
	t = tree();
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	t.cleanup();
});

itApp("/ serves the React app with the document's security headers", async () => {
	const res = await call(ui.url, "/");
	expect(res.status).toBe(200);
	expect(res.body).toContain('id="toolbar"');
	expect(res.headers["x-frame-options"]).toBe("DENY");
	expect(res.headers["content-security-policy"]).toContain("script-src 'self'");
	expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});

itApp("a deep link renders HTML, never the bare JSON 404 it used to", async () => {
	for (const path of ["/runs", "/docs", "/harness", "/graph"]) {
		const res = await call(ui.url, path);
		expect(res.status, path).toBe(200);
		expect(res.headers["content-type"], path).toContain("text/html");
		expect(res.body, path).not.toContain('{"error":"not found"}');
	}
});

itApp("client assets are served beside the SSR handler", async () => {
	const dir = join(process.cwd(), "dist-app", "client", "assets");
	const js = readdirSync(dir).find((f) => f.endsWith(".js"));
	expect(js).toBeDefined();
	const res = await call(ui.url, `/assets/${js}`);
	expect(res.status).toBe(200);
	expect(res.headers["content-type"]).toBe("text/javascript");
});

itApp("the API routers still answer before the app does", async () => {
	const res = await call(ui.url, "/api/projects");
	expect(res.status).toBe(200);
	expect(res.headers["content-type"]).toContain("application/json");
});
