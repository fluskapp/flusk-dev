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
		// 8 / g is the Graph panel; both spellings must reach the same kind.
		'"8": "graph"',
		'g: "graph"',
		'"9": "web"',
		'u: "web"',
		'"0": "ask"',
		'a: "ask"',
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
	// The Graph button means "about whatever is open NOW", so it drops an aim
	// left behind on ANOTHER file — and keeps the symbol just clicked in the one
	// on screen, which is the other half of the gesture the help sheet advertises.
	expect(served).toContain('if (kind === "graph") { graphReaim(); }');
	expect(served).toContain("if (G.want && G.want.file !== graphOnScreen()) G.want = null;");
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

/**
 * The Ask-AI panel is the one place a prompt is assembled FOR the user, so the
 * bundle has to ship the parts that keep it honest: the capture, the switchable
 * blocks, and the frame that echoes the finished prompt back.
 */
it("ships an Ask panel whose prompt and context are both on screen", () => {
	for (const part of [
		"function loadAsk(",
		"function askCapture(",
		"function askBlocks(",
		"function askToggleBlock(",
		'"/api/ask/context?file="',
		'"/api/ask/answerers"',
		'fetch("/api/ask"',
	]) {
		expect(served).toContain(part);
	}
	// The prompt frame is rendered, not merely received: this is what makes an
	// auto-attached context debuggable rather than a black box.
	expect(served).toContain('chunk.type === "prompt"');
	expect(served).toContain("Exact prompt sent");
	// The four one-click actions are pre-filled QUESTIONS, not hidden modes.
	for (const label of ["Explain this", "Find the bug", "Write a test", "What breaks"]) {
		expect(served).toContain(label);
	}
	// The toolbar button re-snapshots; returning to the tab must not.
	expect(served).toContain('if (kind === "ask") { A.recapture = true; }');
	// An unavailable answerer stays in the picker, disabled, with its reason.
	expect(served).toContain('a.available ? "" : " disabled"');
});
