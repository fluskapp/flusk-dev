/**
 * The workbench shell. These assertions pin the page's structure — the three
 * tool windows, the chat picker, the attention region, the shortcut sheet —
 * and the one rule renderPage must never break: the only value it
 * interpolates is escaped.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { renderPage } from "../src/ui/page.js";
import { startUiServer, type UiServer } from "../src/ui/server.js";

let home: string;
let ui: UiServer;
let served: string;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "ah-page-home-"));
	process.env.AH_HOME = home;
	ui = await startUiServer(0);
	served = await (await fetch(`${ui.url}/`)).text();
});

afterAll(async () => {
	await ui.close();
	delete process.env.AH_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("serves the three tool windows and every view container", () => {
	for (const marker of [
		'id="toolbar"',
		'id="side"',
		'id="tree"',
		'id="main"',
		'id="tabs"',
		'id="views"',
		'id="chat"',
		'id="status"',
	]) {
		expect(served).toContain(marker);
	}
	for (const view of ["overview", "runs", "docs", "brain", "project", "run", "doc"]) {
		expect(served).toContain(`<div id="${view}" class="view"`);
	}
});

it("ships the chat tool window with a backend picker and stop control", () => {
	for (const marker of [
		'id="chat-backend"',
		'id="chat-send"',
		'id="chat-stop"',
		'id="chat-input"',
		'id="chat-cwd"',
		"/api/chat/backends",
		'fetch("/api/chat"',
		"ah-chat-backend",
	]) {
		expect(served).toContain(marker);
	}
});

it("leads with the attention region, built from the project scan", () => {
	for (const marker of [
		'id="overview"',
		"Needs attention",
		"Nothing needs attention",
		"loadAttention",
		"/api/projects",
		"/api/runs?limit=",
	]) {
		expect(served).toContain(marker);
	}
});

it("documents the keyboard map in the help overlay", () => {
	const keys = [
		"/",
		"j",
		"k",
		"Enter",
		"1",
		"2",
		"3",
		"4",
		"o",
		"r",
		"d",
		"b",
		"c",
		"t",
		"Esc",
		"?",
	];
	for (const k of keys) expect(served).toContain(`<kbd>${k}</kbd>`);
	expect(served).toContain('id="help"');
	expect(served).toContain("Search projects");
});

it("keeps both themes and the theme toggle", () => {
	expect(served).toContain(':root[data-theme="dark"]');
	expect(served).toContain("@media (prefers-color-scheme: dark)");
	expect(served).toContain(':root:not([data-theme="light"])');
	expect(served).toContain('id="theme"');
	expect(served).toContain("ah-theme");
});

it("escapes the one value it interpolates", () => {
	const hostile = '/tmp/</script><img src=x onerror="alert(1)">&';
	const page = renderPage(hostile);
	expect(page).not.toContain("</script><img");
	expect(page).not.toContain('onerror="alert');
	expect(page).toContain("&lt;/script&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;");
	// One script element: nothing the value carried could have closed it early.
	expect(page.split("</script>")).toHaveLength(2);
});

it("leaves no unexpanded template placeholder in the shipped page", () => {
	expect(renderPage("/tmp/ah")).not.toContain("${");
});

it("ships a client script that parses", () => {
	const page = renderPage("/tmp/ah");
	const js = page.slice(page.indexOf("<script>") + 8, page.indexOf("</script>"));
	expect(js.length).toBeGreaterThan(1000);
	// Function() compiles the body without running it: a typo in any of the
	// client-*.ts strings fails here instead of in the browser.
	expect(() => new Function(js)).not.toThrow();
});
