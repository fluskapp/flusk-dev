/**
 * The Documentation tool window, as the browser receives it: the docked panel
 * and its number, the sections in IntelliJ's order, the RELATED half no IDE
 * can show, and every one of its shortcuts in the help sheet.
 *
 * The escaping half lives in ui-doc-rows.test.ts, which runs the row builders
 * over hostile values rather than pattern-matching the source.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";
import { DOC_CSS } from "../src/ui/styles-doc.js";

let home: string;
let ui: UiServer;
let served: string;

const has = (markers: string[]): void => {
	for (const m of markers) expect(served).toContain(m);
};

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "ah-page-doc-"));
	process.env.AH_HOME = home;
	ui = await startUiServer(0);
	served = await (await fetch(`${ui.url}/`)).text();
});

afterAll(async () => {
	await ui.close();
	delete process.env.AH_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("docks a Documentation tool window numbered 7, pinned rather than a popup", () => {
	has(['id="docwin"', 'id="doc-body"', 'id="doc-sym"', 'id="doc-btn"', 'id="doc-hide"']);
	// The header badge, the toolbar button and the key binding must agree.
	has(['<span class="tw-num">7</span>', '<span class="n">7</span>', "Documentation"]);
	has(['if (n === "7") docQuick()', "function toggleDoc()", 'classList.toggle("doc-on"']);
	// 7 LOOKS UP the symbol under the caret rather than only toggling a rail.
	has(["function docQuick()", "codeLookupCaret()"]);
	// Draggable, like every other tool window.
	has(['twGrip($("#docwin"), "doc-grip"', '"--tw-doc", DOC_W_KEY', "#doc-grip {"]);
	// A grid column, not an overlay: it shrinks the editor instead of covering it.
	has(["body.doc-on #app", "var(--tw-doc)", "body.doc-on.side-off.chat-off #app"]);
	// Pinned: the panel is updated in place by the viewer's hand-off, and the
	// event is honoured too, so either half is worth shipping alone.
	has(["function showSymbolDoc(payload)", 'document.addEventListener("ah-doc"']);
});

it("shows signature, docs, tags, definition and usages, and who answered", () => {
	has(['docSec("Signature"', 'docSec("Documentation"', 'docSec("Defined in"']);
	has(['docSec("Usages"', 'docSec("Related"', 'docSec("Parameters and returns"']);
	// Markdown and highlighting stay on the server: one renderer, one escaping rule.
	has(["postRender(doc.signature", 'postRender(doc.docs, "md")', '"/api/render"']);
	// The engine that answered is on screen — a thin panel says why it is thin.
	has(['id="doc-provider"', 'doc ? doc.provider : "none"']);
	// Usages hand the query to Find in Files instead of searching again.
	has(["function docFindUsages()", '$("#find-q").value = doc.name', "runFind();"]);
	// Named for what it does: a literal ripgrep, not the engine's usages query.
	has(['data-doc="usages:', "Search files for "]);
	expect(served).not.toContain("Find all usages of ");
});

it("shows the RELATED half: commits, runs and docs, each with its why", () => {
	has(["function docRelated(", "function docRelRow(", 'class="dw-why"']);
	has(['["commits", "Commits"]', '["runs", "Runs and sessions"]', '["docs", "Docs and skills"]']);
	has(["esc(it.why)", "literal mention"]);
	// Click-through to evidence the workbench already renders: a commit to its
	// history card, a run or doc to its tab, a location to the file at its line.
	has(['(it.kind === "commit" ? "commit:" : "ref:")', 'data-doc="loc:']);
	// A commit is looked up BY REF: searching the index for a 40-char sha
	// returned nothing, so every commit row was a dead click that copied a sha.
	has(['"/api/history/card?ref=" + encodeURIComponent(ref)', "palCard(hit)"]);
	has(['openRef(value, el.getAttribute("data-title"))', "openFile(path, line || 0)"]);
	// A row that cannot be opened is not clickable and says why.
	has(["function docOpenable(file)", "dw-inert", "outside the indexed sources"]);
});

it("never renders a blank box: every empty state is a sentence", () => {
	// The empty state names a gesture that WORKS: it used to point at a code
	// viewer nothing ever opened and at ⌘B, which looks nothing up.
	has(["No symbol at the caret. Open a source file", "click any identifier in it"]);
	has(["Indexing this project to look up "]);
	// The server owns the reason a language is unsupported; the panel prints it.
	has(['docEmpty(p.note || "no symbol at this position")']);
	has(["no doc comment here", "no usages in the indexed sources"]);
	has(["nothing in the history index mentions this symbol yet"]);
	has(["no declaration for this symbol in the indexed sources"]);
});

it("binds F1, 7, ⌘B, ⌥F7 and ⌘F12, and documents every one of them", () => {
	has(['if (e.key === "F1") { e.preventDefault(); docQuick(); return; }']);
	has(['if (e.altKey && e.key === "F7")', "docFindUsages(); return;"]);
	// The shift guards: ⌘⇧B is the browsers' bookmarks shortcut and must survive.
	has(['if (key === "b" && !e.shiftKey && !isTyping(document.activeElement))']);
	has(["docGoToDefinition()", 'if (key === "f12" && !e.shiftKey)', "function focusOutline()"]);
	has(["/^[1-7]$/.test(e.key)"]);
	// Every gesture has a row in the help sheet, grouped.
	has(['id="help-doc"', "Documentation tool window &mdash; look up, or show"]);
	has(["Go to the definition of the selected symbol", "Find usages &mdash;"]);
	has(["File structure &mdash; focus the outline", "Documentation (&#8984;7)"]);
	// 7 leads and F1 follows: on macOS F1 is brightness-down by default.
	const seven = served.indexOf("Documentation tool window &mdash; look up, or show");
	expect(seven).toBeGreaterThan(-1);
	expect(served.indexOf("The same, where the keyboard sends F1 at all")).toBeGreaterThan(seven);
});

it("paints from theme tokens only, so both themes are correct by construction", () => {
	// Not one literal colour: every value is a token styles-theme.ts defines
	// for light AND dark, so there is no third place for the two to disagree.
	expect(DOC_CSS).not.toMatch(/:\s*(#[0-9a-fA-F]|rgb|hsl)/);
	for (const token of ["var(--panel)", "var(--border)", "var(--dim)", "var(--accent)"]) {
		expect(DOC_CSS).toContain(token);
	}
});
