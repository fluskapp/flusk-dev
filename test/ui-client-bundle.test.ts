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
	home = mkdtempSync(join(tmpdir(), "ah-bundle-home-"));
	process.env.AH_HOME = home;
	ui = await startUiServer(0);
	served = await (await fetch(`${ui.url}/`)).text();
});

afterAll(async () => {
	await ui.close();
	delete process.env.AH_HOME;
	rmSync(home, { recursive: true, force: true });
});

it("ships the handler the help overlay describes, not only the sheet", () => {
	// The sheet is static markup in client-shell.ts, so asserting it alone
	// stayed green with CLIENT_KEYS_JS deleted from the bundle entirely.
	expect(served).toContain("PANEL_KEYS");
	for (const binding of [
		'"1": "attention"',
		'"2": "runs"',
		'"3": "docs"',
		'"4": "brain"',
		'o: "attention"',
		'r: "runs"',
		'd: "docs"',
		'b: "brain"',
	]) {
		expect(served).toContain(binding);
	}
	// A panel key opens the WHOLE panel: no filter left over from a drill-in.
	expect(served).toContain("openPanel(PANEL_KEYS[e.key])");
	expect(served).toContain('if (kind === "runs") { S.runFilter = null; S.runSort = null; }');
	for (const gesture of ["moveCursor(1)", "moveCursor(-1)", "openCursor()", "focusChat()"]) {
		expect(served).toContain(gesture);
	}
});
