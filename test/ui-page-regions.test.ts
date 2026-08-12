/**
 * The two page regions the workbench overhaul rewrote its tests around.
 *
 * `ui-page.test.ts` was reorganised for the numbered tool windows, and the
 * cases pinning the chat panel's controls and the attention region went with
 * it. Both are still shipped, and the attention region is still the first
 * thing the page shows — so their page-level assertions live on here rather
 * than being lost to a refactor of the file that used to hold them.
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
	home = mkdtempSync(join(tmpdir(), "flusk-page-regions-"));
	process.env.FLUSK_HOME = home;
	ui = await startUiServer(0);
	served = await (await fetch(`${ui.url}/`)).text();
});

afterAll(async () => {
	await ui.close();
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("ships the chat tool window with a backend picker and stop control", () => {
	has(['id="chat-backend"', 'id="chat-send"', 'id="chat-stop"', 'id="chat-input"']);
	has(['id="chat-cwd"', "/api/chat/backends", 'fetch("/api/chat"', "flusk-chat-backend"]);
});

it("leads with the attention region, built from the project scan", () => {
	has(['id="overview"', "Needs attention", "Nothing needs attention"]);
	has(["loadAttention", "/api/projects", "/api/runs?limit="]);
});

it("documents the keyboard map in a grouped help overlay", () => {
	const keys = ["/", "j", "k", "Enter", "1", "2", "3", "5", "6", "o", "r", "d", "c", "t"];
	for (const k of [...keys, "Esc", "?", "w"]) expect(served).toContain(`<kbd>${k}</kbd>`);
	has(['id="help"', "Search projects", 'class="help-groups"', 'class="help-group"']);
	for (const group of [
		"help-nav",
		"help-tw",
		"help-search",
		"help-find",
		"help-editor",
		"help-window",
	]) {
		expect(served).toContain(`id="${group}"`);
	}
	// Both search surfaces are discoverable from the sheet, not only from docs.
	has(["Find in Files", "Go to File"]);
	// ⌘W is not advertised, because it is not bound: the browser owns it.
	expect(served).not.toContain("<kbd>&#8984;W</kbd>");
});

it("keeps both themes and the theme toggle", () => {
	has([':root[data-theme="dark"]', "@media (prefers-color-scheme: dark)"]);
	has([':root:not([data-theme="light"])', 'id="theme"', "flusk-theme"]);
	// Every colour is a token defined for BOTH themes — including the new ones.
	for (const token of ["--match-bg", "--match-fg", "--gutter-bg", "--row"]) {
		expect(served.split(token).length).toBeGreaterThan(2);
	}
});

it("makes every tool window resizable, not only the chat rail", () => {
	// IntelliJ drags all three splitters; flusk hard-coded --tw-left and
	// --tw-bottom, so Find was stuck at nine rows whatever you searched for.
	has(["function twGrip(", "function twSize(", "function wireGrips()"]);
	has(['"--tw-left"', '"--tw-bottom"', '"--tw-right"']);
	has(["#side-grip", "#find-grip", "#chat-grip", ".tw-grip"]);
	has(['"side-grip"', '"find-grip"', '"chat-grip"']);
	has(["flusk-side-width", "flusk-find-height", "flusk-chat-width"]);
});

it("remembers the find controls the way it remembers everything else", () => {
	has(["flusk-find-state", "function saveFindState()", "function restoreFindState()"]);
	// and a superseded search is aborted, not merely ignored
	has(["F.ac.abort()", "signal: F.ac.signal"]);
});
