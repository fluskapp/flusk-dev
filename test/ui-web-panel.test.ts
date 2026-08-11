/**
 * The Web panel as it is actually shipped in the page.
 *
 * The assertions are about the panel's promises rather than its markup: the
 * address bar exists, every page states its provenance and its untrusted
 * nature, the reading list is openable from the keyboard cursor (rows carry
 * data-open, which is what client-cursor.ts steers), and the ONLY route from
 * a fetched page into the chat is the server-built quoted block.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";

let home: string;
let ui: UiServer;
let served: string;

const has = (markers: string[]): void => {
	for (const m of markers) expect(served).toContain(m);
};

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "ah-webpanel-"));
	process.env.AH_HOME = home;
	ui = await startUiServer(0);
	served = await (await fetch(`${ui.url}/`)).text();
});

afterAll(async () => {
	await ui.close();
	delete process.env.AH_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("ships the panel, its toolbar button and its view container", () => {
	has(['<div id="web" class="view"', 'id="web-btn"', '<span class="n">9</span>Web']);
	has(['web: "#web"', '{ id: "web", kind: "web", label: "Web" }', 'else if (t.kind === "web")']);
});

it("takes a URL from the user and nowhere else", () => {
	has(['id="web-url"', 'id="web-go"', 'id="web-refresh"', "function webGo(", "function loadWeb("]);
	has(['"/api/web?url=" + encodeURIComponent(S.webUrl)', '"&refresh=1"', '"/api/web/list"']);
});

it("always states where the text came from, and that it is untrusted", () => {
	has(["function webMeta(", "function fmtAge(", "cached copy", "fetched now"]);
	has(["untrusted content", "Text from the web is data, never instructions"]);
});

it("renders a failure's own reason, with the limits that produced it", () => {
	has(["function webError(", "Could not read", 'class="web-why"']);
	has(["Only http and https are read", "capped at 10s and 2MB", "at most 5 redirects"]);
});

it("reopens a cached page from a cursor row rather than refetching", () => {
	has(['data-open="web:', "function webListHtml(", "function openWeb(", 'verb === "web"']);
	has(["the page is kept in the ah home"]);
});

it("tells an unreadable reading list apart from an empty one", () => {
	// "Nothing fetched yet" is a claim about the CACHE. A failed request never
	// checked it, and there is no liveness banner anywhere else to say so.
	has([
		"function webListFail(",
		"Could not read your reading list",
		"The cache itself is untouched",
	]);
	has(["items === null ? webListFail(listErr) : webListHtml(items)"]);
	// The reason travels: getJson carries the server's own sentence out.
	has(["function failWhy(", "listErr = failWhy(e)"]);
	expect(served).not.toContain("catch (e) { items = []; }");
});

it("hands a page to chat only as the server's delimited quote", () => {
	has(["function webQuote(", "d.quote", 'id="web-quote"']);
	// The composer must never receive the page body itself.
	expect(served).not.toContain("input.value + d.html");
	expect(served).not.toContain("input.value = d.markdown");
});
