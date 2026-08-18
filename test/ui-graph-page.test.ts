/**
 * The Graph tool window as the page actually ships it.
 *
 * It lives beside ui-page.test.ts rather than inside it because that file is
 * at the repository's line cap; the assertions are the same kind — markers
 * pinned against the served document, so a module dropped from the bundle or a
 * panel unwired from the toolbar fails here rather than in a browser.
 *
 * The Graph panel is an EDITOR TAB, which is why 8 has no branch of its own in
 * toolWindow: the digits with no branch fall through to openPanel, and that
 * fall-through is what makes a number mean the WHOLE panel rather than
 * whatever a drill-in left it aimed at.
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
	home = mkdtempSync(join(tmpdir(), "flusk-graph-page-"));
	process.env.FLUSK_HOME = home;
	ui = await startUiServer(0);
	// "/" serves the built React app now (server-app-door.test.ts); the markup
	// pinned here is the legacy fallback page, so it comes from renderPage.
	served = renderPage(home);
});

afterAll(async () => {
	await ui.close();
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("wires the panel: a view container, a numbered button, and one route", () => {
	has(['<div id="graph" class="view"', 'id="graph-btn"', '<span class="n">8</span>']);
	has(['"/api/graph?file="', "function loadGraph("]);
	// Registered in every map a tab kind must appear in, or the tab strip and
	// the toolbar highlight disagree about which panel is on screen.
	has(['graph: "#graph"', 'graph: "#graph-btn"', 'kind: "graph", label: "Graph"']);
	has(['else if (t.kind === "graph") loadGraph();', 'openPanel("graph")']);
});

it("ships all four answers and the drawing, not only the fetch", () => {
	has(["function gBlast(", "function gCoChange(", "function gProvenance(", "function gLocal("]);
	has(["function ggDraw(", "function ggRow(", '<svg class="gg-svg" viewBox="']);
	// Every row's justification and its audit trail.
	has(["function gWhy(", "function gPath(", 'class="gg-why"', 'data-open="gnode:']);
	// Degrading is a shipped behaviour, not a comment about one.
	has(["DRAW_MAX: 12", 'if (rows > GG.DRAW_MAX) return "";', "past what stays readable"]);
});

it("follows the Documentation window rather than asking a second time", () => {
	has([
		"function graphFollow(",
		"showSymbolDoc = function (p) { graphFollow(p); return inner(p); }",
	]);
	// The defining file is what identifies a symbol; the file you were reading
	// when you clicked would mint an id nothing has ever put.
	has(["defined.file", "defined ? doc.name : null"]);
	// The toolbar button means "about whatever is open NOW" — which includes the
	// symbol just clicked in the file on screen, and excludes an aim at any other.
	has(['if (kind === "graph") { graphReaim(); }', "function graphReaim()"]);
	has(["if (G.want && G.want.file !== graphOnScreen()) G.want = null;"]);
});

it("makes the empty state actionable instead of merely worded", () => {
	has(["function graphBuild(", '"/api/graph/build?repo="', 'verb === "gbuild"']);
	has(['data-open="gbuild:', "Index this project", "gg-empty"]);
	// The keyboard reaches it, and the sheet says so.
	has(['"8": "graph"', 'g: "graph"', 'id="help-graph"', "<kbd>8</kbd>", "<kbd>g</kbd>"]);
});

it("styles the panel from theme tokens alone — no literal colour", () => {
	const css = served.slice(served.indexOf("<style>"), served.indexOf("</style>"));
	const graph = css.slice(css.indexOf(".gg-head"));
	expect(graph).toContain(".gg-svg");
	expect(graph).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
	for (const token of ["--accent", "--border", "--dim", "--text", "--panel"]) {
		expect(graph).toContain(`var(${token})`);
	}
});
