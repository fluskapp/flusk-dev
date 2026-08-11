/**
 * The address bar as state.
 *
 * A run had no URL: reloading landed on Attention, Back left the app, and
 * sending someone a run meant sending a file path and instructions. These pin
 * the parts that are easy to get subtly wrong — the write guard, and push
 * versus replace — because both failures are invisible until someone actually
 * uses the Back button.
 */
import { expect, it } from "vitest";
import { CLIENT_JS } from "../src/ui/client-bundle.js";
import { CLIENT_ROUTER_JS } from "../src/ui/client-router.js";

/** Evaluates the router with a fake history/location and a fake tab model. */
function router(active: string, hash = "") {
	const calls: string[] = [];
	const loc = { hash };
	const hist = {
		pushState: (_s: unknown, _t: string, url: string) => {
			calls.push(`push ${url}`);
			loc.hash = url;
		},
		replaceState: (_s: unknown, _t: string, url: string) => {
			calls.push(`replace ${url}`);
			loc.hash = url;
		},
	};
	const prelude = `
		var S = { active: ${JSON.stringify(active)}, tabs: [] };
		var opened = [];
		function tabById(id) { return S.tabs.filter(function (t) { return t.id === id; })[0] || null; }
		function renderTabs() {}
		function renderActive() {}
		function openPanel(id) { opened.push("panel:" + id); return true; }
		function openProject(n) { opened.push("project:" + n); }
		function openRef(r) { opened.push("ref:" + r); }
	`;
	const src = `${prelude}\n${CLIENT_ROUTER_JS}\n;return { syncRoute: syncRoute, applyRoute: applyRoute, routeOf: routeOf, opened: opened };`;
	const make = new Function("location", "history", "window", src) as (
		l: unknown,
		h: unknown,
		w: unknown,
	) => {
		syncRoute: (push: boolean) => void;
		applyRoute: (id: string) => boolean;
		routeOf: () => string;
		opened: string[];
	};
	const api = make(loc, hist, { addEventListener() {} });
	return { api, calls, loc };
}

it("puts the active run in the address bar", () => {
	const { api, calls, loc } = router("run:/runs/pr-201.md");
	api.syncRoute(true);
	expect(calls[0]).toContain("push #");
	// Encoded, so a path with a space or a # cannot truncate the route.
	expect(loc.hash).toBe(`#${encodeURIComponent("run:/runs/pr-201.md")}`);
	expect(api.routeOf()).toBe("run:/runs/pr-201.md");
});

it("pushes when the destination changes and does nothing when it has not", () => {
	const { api, calls } = router("run:/runs/a.md");
	api.syncRoute(true);
	api.syncRoute(true);
	// A live run re-renders every few seconds; each one must not be a history
	// entry, or Back walks through the same run once per poll.
	expect(calls.filter((c) => c.startsWith("push")).length).toBe(1);
});

it("reopens a run named only by the URL", () => {
	const { api } = router("attention");
	expect(api.applyRoute("run:/runs/pr-7.md")).toBe(true);
	expect(api.opened).toContain("ref:/runs/pr-7.md");
});

it("routes a project and a pinned panel", () => {
	const { api } = router("attention");
	api.applyRoute("project:linof-harness");
	api.applyRoute("docs");
	expect(api.opened).toEqual(["project:linof-harness", "panel:docs"]);
});

it("ignores an empty route rather than blanking the workbench", () => {
	const { api } = router("attention");
	expect(api.applyRoute("")).toBe(false);
	expect(api.opened).toEqual([]);
});

it("ships the router in the bundle, wired to tab changes", () => {
	// The regression this guards: a router that exists but nothing calls.
	expect(CLIENT_JS).toContain("function initRouter()");
	expect(CLIENT_JS).toContain("syncRoute(true)");
	expect(CLIENT_JS).toContain("initRouter()");
});
