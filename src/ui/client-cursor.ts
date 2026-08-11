/**
 * The cursor: which list the keyboard is steering, and how it moves.
 *
 * There are two zones — the project tree and the active view's table — and
 * Tab moves between them. A zone with no rows (a rendered document, a
 * journal, a file) is not an error: the keys scroll the editor there instead
 * of being swallowed.
 */
export const CLIENT_CURSOR_JS = `
function cursorRows() {
	if (S.zone === "view") {
		var t = activeTab();
		var view = t ? VIEW_OF[t.kind] : null;
		return view ? $$(view + " tbody tr[data-open]") : [];
	}
	return $$("#tree .tree-row[data-row]");
}

function syncCursor() {
	var rows = cursorRows();
	if (S.cursor >= rows.length) S.cursor = Math.max(0, rows.length - 1);
	rows.forEach(function (el, i) { el.classList.toggle("cursor", i === S.cursor); });
}

function moveCursor(delta) {
	var rows = cursorRows();
	if (!rows.length) return;
	S.cursor = Math.max(0, Math.min(rows.length - 1, S.cursor + delta));
	syncCursor();
	rows[S.cursor].scrollIntoView({ block: "nearest" });
}

function openCursor() {
	var rows = cursorRows();
	var el = rows[S.cursor];
	if (el) handleOpen(el.getAttribute("data-open"));
}

function setZone(zone) {
	S.zone = zone;
	S.cursor = 0;
	$$(".cursor").forEach(function (el) { el.classList.remove("cursor"); });
	syncCursor();
}

/**
 * Arrows and j/k move the cursor where there IS one. A rendered document,
 * journal or file tab has no rows, and preventDefault fired before that was
 * checked — so a long journal could not be scrolled from the keyboard at all.
 * With no rows the editor area scrolls instead of the key being swallowed.
 */
function moveOrScroll(e, delta) {
	e.preventDefault();
	if (cursorRows().length) { moveCursor(delta); return; }
	var pane = $("#views");
	if (pane) pane.scrollBy(0, delta * 60);
}

`;
