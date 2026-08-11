/**
 * The address bar as state, so a run is a place you can go back to.
 *
 * Every tab already carries an id that identifies it exactly — "run:<path>",
 * "doc:<path>", "project:<name>", or a pinned panel's own name — so the id IS
 * the route and nothing new has to be invented to name a run. Without this the
 * workbench had no URL state at all: a reload landed on Attention, the browser
 * Back button left the app entirely, and the only way to send someone a run was
 * to send them a file path and instructions.
 *
 * Two rules keep it from fighting itself:
 *
 *  - Writes are marked. Setting location.hash fires hashchange, so an unguarded
 *    listener would re-open the tab it just opened and fight the user's Back.
 *  - Opening a tab PUSHES, re-rendering the same tab REPLACES. Otherwise every
 *    5-second refresh of a live run would add a history entry, and Back would
 *    walk through the same run once per poll instead of leaving it.
 */
export const CLIENT_ROUTER_JS = `
var ROUTE_WRITING = false;

/** The tab id the URL names, or "" when there is none. */
function routeOf() {
	var raw = String(location.hash || "").replace(/^#/, "");
	if (!raw) return "";
	try { return decodeURIComponent(raw); } catch (e) { return ""; }
}

/**
 * Point the URL at the active tab. \`push\` only when the destination changed —
 * a live run re-renders every few seconds and each one would be a history entry.
 */
function syncRoute(push) {
	var id = S.active;
	if (!id || routeOf() === id) return;
	ROUTE_WRITING = true;
	var url = "#" + encodeURIComponent(id);
	if (push) history.pushState({ id: id }, "", url);
	else history.replaceState({ id: id }, "", url);
	ROUTE_WRITING = false;
}

/**
 * Open whatever the route names. Unknown or malformed routes fall back to the
 * default panel rather than leaving a blank workbench — a stale bookmark to a
 * run that has since been deleted should still land somewhere usable.
 */
function applyRoute(id) {
	if (!id) return false;
	if (tabById(id)) { S.active = id; renderTabs(); renderActive(true); return true; }
	var at = id.indexOf(":");
	if (at === -1) return openPanel(id) !== false;
	var kind = id.slice(0, at);
	var ref = id.slice(at + 1);
	if (kind === "project") { openProject(ref); return true; }
	if (kind === "run" || kind === "doc" || kind === "file") { openRef(ref); return true; }
	return false;
}

function initRouter() {
	window.addEventListener("hashchange", function () {
		if (ROUTE_WRITING) return;
		applyRoute(routeOf());
	});
	window.addEventListener("popstate", function () {
		if (ROUTE_WRITING) return;
		applyRoute(routeOf());
	});
	// A route in the address bar wins over the default panel on a cold load.
	var initial = routeOf();
	if (initial) applyRoute(initial);
	else syncRoute(false);
}
`;
