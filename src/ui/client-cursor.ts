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

/**
 * IntelliJ paints a selection in two colours: the focused one where the
 * keyboard is, the inactive one where it is not. \`zone-view\` on <body> is
 * which of the two the view's table draws.
 */
function markZone() {
	document.body.classList.toggle("zone-view", S.zone === "view");
}

function syncCursor() {
	markZone();
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

/**
 * Leaving the view no longer erases its selected row: the row stays marked and
 * the stylesheet repaints it in the inactive colour, which is what tells you
 * where Tab will put you back — so the index has to be kept per zone, or the
 * mark would point at a row Tab does not return to. The tree's own mark IS
 * cleared on the way into the view, because the tree paints its cursor as a
 * focus ring and two focus rings at once would be a lie.
 */
function setZone(zone) {
	S.cursorOf[S.zone] = S.cursor;
	S.zone = zone;
	S.cursor = S.cursorOf[zone] || 0;
	if (zone === "view") {
		$$("#tree .cursor").forEach(function (el) { el.classList.remove("cursor"); });
	}
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
