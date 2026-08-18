/**
 * What the shipped client is allowed to SAY, asserted against the page it
 * actually serves.
 *
 * Every case here is a panel stating something it never checked, which is worse
 * than the empty box the panels' own headers rule out: a failed request
 * rendered as "no answerer available" or "no graph for this file", a build that
 * could not write its log toasted as a successful index, and a block the user
 * unticked still going to the model because a delegated listener was bound once
 * per render and flipped the state an even number of times.
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
	home = mkdtempSync(join(tmpdir(), "flusk-honesty-"));
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

it("carries a failed request's own reason out of getJson", () => {
	// The status alone was all that survived, so every caller had to invent a
	// sentence — which is how a 500 got reported as a containment refusal.
	has(["err.status = r.status;", 'err.reason = (body && body.error) || "";']);
	has(["function failWhy(", "the dashboard could not reach the server"]);
});

it("binds the Ask panel's delegated listener once, and sets state from the checkbox", () => {
	// #ask is created once and only its innerHTML is rewritten, so a listener
	// added per render accumulates: on an even count the toggles cancelled out
	// and the block the checkbox said was excluded was still posted.
	has(['if (host.dataset.wired !== "1") {', 'host.dataset.wired = "1";']);
	has(['askToggleBlock(box.getAttribute("data-ask-block"), box.checked)']);
	has(["function askToggleBlock(id, checked) {", "A.off[id] = !checked;"]);
	expect(served).not.toContain("A.off[id] = !A.off[id];");
});

it("discloses who wrote an agent, and what it will prepend, before Ask is pressed", () => {
	has(["function askScopeText(", '"from this repo"', '"yours"']);
	// The preamble is rendered as its own block and counted in the size line —
	// the prompt frame only arrives after the request has been dispatched.
	has(["function askPreamble(", "function askPreambleHtml(", "who.preamble"]);
	has(["prepended to your question and not switchable", "size + head.length"]);
});

it("says an answerer list failed rather than that the machine has none", () => {
	has(['A.whoErr = "answerer list unavailable: " + failWhy(e);']);
	has(['esc(A.whoErr || "no answerer available")']);
	has(['toast(A.whoErr || "No answerer available")']);
});

it("tells a graph refusal, a server failure and an unreachable server apart", () => {
	has(["function graphFail(", "The graph request failed", "The dashboard could not be reached"]);
	// The containment sentence survives, but only for a 4xx.
	has(["if (status >= 400 && status < 500)", "a path outside your configured projects has none"]);
	expect(served).not.toContain("try { d = await getJson(url); } catch (e) { d = null; }");
});

it("reports a build's own reason instead of toasting a failure as a success", () => {
	// POST /api/graph/build answers 200 with `reason` and never `error`, so a
	// store write that failed and an over-cap project both read as "Indexed 0".
	has(["var why = rep.error || rep.reason;", '"Index incomplete: "']);
});
