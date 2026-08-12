/**
 * The client bundle the page actually ships.
 *
 * The help overlay is static markup, so pinning it alone stayed green with
 * the whole keyboard module deleted from the bundle. These assertions name
 * the shipped handler instead.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { startUiServer, type UiServer } from "../src/ui/server.js";

let home: string;
let ui: UiServer;
let served: string;

beforeAll(async () => {
	home = mkdtempSync(join(tmpdir(), "flusk-bundle-home-"));
	process.env.FLUSK_HOME = home;
	ui = await startUiServer(0);
	served = await (await fetch(`${ui.url}/`)).text();
});

afterAll(async () => {
	await ui.close();
	delete process.env.FLUSK_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("ships the handler the help overlay describes, not only the sheet", () => {
	// The sheet is static markup in client-shell.ts, so asserting it alone
	// stayed green with CLIENT_KEYS_JS deleted from the bundle entirely.
	expect(served).toContain("PANEL_KEYS");
	for (const binding of [
		'"2": "runs"',
		'"3": "docs"',
		'o: "attention"',
		'r: "runs"',
		'd: "docs"',
	]) {
		expect(served).toContain(binding);
	}
	// The tool windows are numbered the way IntelliJ numbers them: 1 Projects,
	// 5 Find, 6 Chat are windows to fold, 2/3 are editor panels to open.
	for (const binding of [
		'if (n === "1") toggleSide()',
		'else if (n === "4") toggleFind()',
		'else if (n === "5") toggleChat()',
	]) {
		expect(served).toContain(binding);
	}
	// A panel key opens the WHOLE panel: no filter left over from a drill-in.
	expect(served).toContain("openPanel(PANEL_KEYS[e.key])");
	expect(served).toContain('if (kind === "runs") { S.runFilter = null; S.runSort = null; }');
	for (const gesture of [
		"moveOrScroll(e, 1)",
		"moveOrScroll(e, -1)",
		"openCursor()",
		"focusChat()",
	]) {
		expect(served).toContain(gesture);
	}
	// A zone with no rows scrolls the editor rather than swallowing the key:
	// a rendered document has no cursor rows, and it must still scroll.
	expect(served).toContain("function moveOrScroll(");
	expect(served).toContain("pane.scrollBy(0, delta * 60)");
	// ⌘W is the browser's; binding it closed the whole session.
	expect(served).not.toContain('if (key === "w") { closeActiveTab(); return true; }');
});
