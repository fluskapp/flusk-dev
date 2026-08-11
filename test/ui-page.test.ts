/**
 * The workbench shell. These assertions pin the page's structure — the
 * numbered tool windows, the tab strip and its breadcrumb, the Find in Files
 * panel, the markdown preview control, the status bar, the grouped shortcut
 * sheet — and the one rule renderPage must never break: the only value it
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

const has = (markers: string[]): void => {
	for (const m of markers) expect(served).toContain(m);
};

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

it("serves every tool window, the tab strip and every view container", () => {
	has(['id="toolbar"', 'id="side"', 'id="tree"', 'id="main"', 'id="tabs"', 'id="views"']);
	has(['id="chat"', 'id="find"', 'id="status"', 'id="crumbs"']);
	for (const view of ["overview", "runs", "docs", "project", "run", "doc", "file"]) {
		expect(served).toContain(`<div id="${view}" class="view"`);
	}
});

it("numbers the tool windows the way IntelliJ does: 1 Projects … 6 Documentation", () => {
	// The header badge, the toolbar button and the key binding must agree.
	has(['<span class="tw-num">1</span>', '<span class="tw-num">4</span>']);
	has(['<span class="tw-num">5</span>', 'id="side-btn"', 'id="find-btn"', 'id="chat-btn"']);
	// 1..N with no hole. Deleting a tool window is exactly when a gap appears,
	// and the shortcut in the middle then opens nothing.
	const shown = [...served.matchAll(/<span class="n">(\d)<\/span>/g)]
		.map((m) => Number(m[1]))
		.sort((a, b) => a - b);
	expect(shown).toEqual([1, 2, 3, 4, 5, 6]);
	has([
		"function toolWindow(n)",
		'if (n === "1") toggleSide()',
		'else if (n === "4") toggleFind()',
	]);
});

it("ships the Find in Files panel: query, scope, mask, toggles, result tree", () => {
	has(['id="find-q"', 'id="find-scope"', 'id="find-mask"', 'id="find-case"', 'id="find-regex"']);
	has(['value="project">This project', 'value="all">All projects', "Match case", "Regex"]);
	has(['"/api/find?q="', '"&glob="', '"&case=1"', '"&regex=1"']);
	// A tree: file rows with a count, match rows with a gutter and a marked span.
	has(["fx-file", "fx-count", "fx-line", '"gutter"', "function fxMark(", 'class="hit"']);
	// The note waits 150ms so a fast search never blinks a spinner.
	has(["searching", "}, 150);", "function findSummary(", "truncated"]);
	// A hit opens at its line AND carries the project it came from, so the
	// breadcrumb names the owning repo rather than whatever the tree shows.
	has(["function openFindRow(", "openFile(r.file.path, r.m.line, r.file.project)"]);
	// The find panel's own bindings are documented, not only bound.
	has(['id="help-find"', "Find: next / previous hit", "Find: open the hit"]);
});

it("opens markdown rendered, with the Preview / Split / Raw control", () => {
	has(['var MD_MODES = ["preview", "split", "raw"]', "'<button data-md=\"'", 'class="seg"']);
	has(["Preview", "Split", "Raw", 'var MD_KEY = "ah-md-mode"', "function setMdMode("]);
	// Rendering is the server's, and preview is the default a tab falls back to.
	has([
		'"/api/render"',
		"function postRender(",
		'return MD_MODES.indexOf(m) === -1 ? "preview" : m',
	]);
	// The journal keeps its pipeline and PR link above the rendered body.
	has(["function journalHead(", 'class="stages"', "function loadJournalRun("]);
	// Frontmatter is a property table, never raw YAML.
	has(["function fmTable(", 'class="fm-k"', 'class="fm-v"']);
});

it("goes to a file by fuzzy path, with the matched characters marked", () => {
	has([
		'"/api/files?limit=40"',
		"function goMark(",
		"<mark>",
		'data-pal="files"',
		"function palFiles(",
	]);
	// The history mode it shares the card with is still there.
	has(['"/api/history/search?limit=30"', 'data-pal="history"']);
});

it("draws a breadcrumb and a real status bar", () => {
	has(["function renderCrumbs(", 'class="sep"', '? "leaf" : ""', "#crumbs .leaf"]);
	has(['id="status-cards"', 'id="status-live"', 'id="status-path"', 'id="status-activity"']);
	has(['card" + (cards === 1', "function setActivity(", "function setStatusPath("]);
	expect(served).toContain(home);
});

it("gives every tab a kind glyph and a close affordance", () => {
	has(["function tabGlyph(", 'return "session"', 'return "md"', "function fileGlyph("]);
	has(['class="x" data-close=', "function closeActiveTab("]);
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

/**
 * Regression: the Find tool window opened without taking focus, so the first
 * thing typed after pressing 5 / clicking Find landed in the chat composer.
 * IntelliJ always puts the caret in the query field.
 */
it("focuses the find query when the panel opens, not when it closes", () => {
	const page = renderPage("/tmp/ah-home");
	const toggle = page.slice(page.indexOf("function toggleFind"));
	const body = toggle.slice(0, toggle.indexOf("\nfunction "));
	expect(body).toContain("focus()");
	// Focus must be conditional on opening — focusing on close steals the caret.
	expect(body).toMatch(/if \(opening\)/);
});
