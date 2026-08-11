/**
 * The status bar: what is indexed, what is running, which file the editor is
 * showing, and — right-aligned — whatever is working in the background.
 *
 * It is the one place that is allowed to say "busy": views never spin, so a
 * search or an index rebuild announces itself here and nowhere else.
 */
export const CLIENT_STATUS_JS = `
/** The background-activity note. Empty string clears it. */
function setActivity(text) {
	var el = $("#status-activity");
	if (el) el.textContent = text || "";
}

/** The path the editor is showing; the status bar owns the display of it. */
function setStatusPath(path) {
	S.path = path || "";
	renderStatus();
}

function renderStatus() {
	var cards = 0, live = 0;
	S.projects.forEach(function (p) {
		cards += (p.runs || 0) + (p.docs || 0);
		live += p.liveRuns || 0;
	});
	var el = $("#status-cards");
	if (!el) return;
	el.textContent = cards + " card" + (cards === 1 ? "" : "s") + " indexed";
	$("#status-live").textContent = live ? live + " live" : "idle";
	$("#status-path").textContent = S.path || "no file open";
}
`;
