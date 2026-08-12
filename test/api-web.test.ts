/**
 * GET /api/web over a real socket, against the local fixture site.
 *
 * The route's job is to be honest about three things: what the content is
 * (rendered by the workbench's own renderer, escaped), where it came from
 * (final URL, fetch time, age, and whether this is a cached copy), and why
 * there is nothing when there is nothing. The cache round trip is asserted by
 * the fixture's own request counter — the only way to prove a reopened page
 * did not hit the network again.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { WebReply } from "../src/features/web/web.router.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { LOOPBACK_ENV } from "../src/features/web/limits.js";
import { call } from "./api-http.js";
import { type Site, startSite } from "./web-fixture.js";

let home: string;
let site: Site;
let ui: UiServer;

const get = async (path: string): Promise<{ status: number; body: WebReply }> => {
	const r = await call(ui.url, path);
	return { status: r.status, body: JSON.parse(r.body) as WebReply };
};

const read = (path: string, extra = ""): Promise<{ status: number; body: WebReply }> =>
	get(`/api/web?url=${encodeURIComponent(`${site.url}${path}`)}${extra}`);

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "flusk-apiweb-home-"));
	process.env.FLUSK_HOME = home;
	process.env[LOOPBACK_ENV] = "1";
	site = await startSite();
	ui = await startUiServer(0);
});

afterAll(async () => {
	await ui.close();
	await site.close();
	delete process.env.FLUSK_HOME;
	delete process.env[LOOPBACK_ENV];
	rmSync(home, { recursive: true, force: true });
});

it("renders a fetched page, with its provenance and a quotable block", async () => {
	const { status, body } = await read("/doc");
	expect(status).toBe(200);
	expect(body.error).toBeUndefined();
	expect(body.title).toBe("Widget Guide");
	expect(body.finalUrl).toBe(`${site.url}/doc`);
	expect(body.cached).toBe(false);
	expect(body.ageMs).toBeLessThan(60_000);
	expect(body.html).toContain("<h1>Widget Guide</h1>");
	expect(body.html).toContain('<code class="lang-bash">');
	// The page's own script and navigation never reach the browser.
	expect(body.html).not.toContain("window.tracked");
	expect(body.html).not.toContain("All docs");
	// Anything handed onward to a model is labelled and delimited.
	expect(body.quote).toContain("UNTRUSTED DATA");
});

it("serves a reopened page from the flusk home instead of fetching it again", async () => {
	expect(site.hits["/doc"]).toBe(1);
	const again = await read("/doc");
	expect(again.body.cached).toBe(true);
	expect(again.body.html).toContain("Widget Guide");
	expect(site.hits["/doc"]).toBe(1);
	// …and the reading list knows about it, without the body.
	const list = JSON.parse((await call(ui.url, "/api/web/list")).body) as Array<
		Record<string, unknown>
	>;
	expect(list.some((a) => a.url === `${site.url}/doc`)).toBe(true);
	expect(list.every((a) => a.markdown === undefined)).toBe(true);
});

it("refetches only when asked, and the copy is fresh again", async () => {
	const fresh = await read("/doc", "&refresh=1");
	expect(fresh.body.cached).toBe(false);
	expect(site.hits["/doc"]).toBe(2);
});

it("answers a refusal with the actual reason", async () => {
	const scheme = await get(`/api/web?url=${encodeURIComponent("file:///etc/passwd")}`);
	expect(scheme.status).toBe(200);
	expect(scheme.body.error).toContain("http");
	const big = await read("/big");
	expect(big.body.error).toContain("cap");
	const missing = await read("/missing");
	expect(missing.body.error).toContain("404");
	const none = await get("/api/web");
	expect(none.status).toBe(400);
	expect(none.body.error).toBe("url is required");
});
