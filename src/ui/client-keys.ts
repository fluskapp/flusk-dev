/**
 * Keyboard first. The cursor lives in one of two zones — the project tree or
 * the active view's table — and Tab moves between them; everything else is a
 * single key, because a workbench you have to mouse around is not one.
 */
export const CLIENT_KEYS_JS = `
var PANEL_KEYS = { "1": "attention", "2": "runs", "3": "docs", "4": "brain",
	o: "attention", r: "runs", d: "docs", b: "brain" };

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

function isTyping(el) {
	if (!el) return false;
	var tag = el.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

document.addEventListener("keydown", function (e) {
	if (e.metaKey || e.ctrlKey || e.altKey) return;
	var search = $("#search");
	var typing = isTyping(document.activeElement);

	if (e.key === "Escape") {
		if (!$("#help").hidden) { $("#help").hidden = true; return; }
		if (search.value) { search.value = ""; S.query = ""; renderTree(); toast("Search cleared"); }
		if (typing) document.activeElement.blur();
		return;
	}
	if (typing) {
		if (e.key === "Enter" && document.activeElement === search) {
			e.preventDefault();
			search.blur();
			setZone("tree");
			openCursor();
		}
		return;
	}
	if (e.key === "/") { e.preventDefault(); search.focus(); search.select(); return; }
	if (e.key === "?") { $("#help").hidden = false; return; }
	if (e.key === "Tab") { e.preventDefault(); setZone(S.zone === "tree" ? "view" : "tree"); return; }
	if (Object.prototype.hasOwnProperty.call(PANEL_KEYS, e.key)) {
		// openPanel, not togglePanel: a panel key means the whole panel, with
		// no filter left over from a drill-in.
		openPanel(PANEL_KEYS[e.key]);
		return;
	}
	if (e.key === "c") { e.preventDefault(); focusChat(); return; }
	if (e.key === "t") { toggleTheme(); return; }
	if (e.key === "w") { closeActiveTab(); return; }
	if (e.key === "Enter") { e.preventDefault(); openCursor(); return; }
	if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); moveCursor(1); }
	else if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); moveCursor(-1); }
});
`;
