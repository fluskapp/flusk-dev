/**
 * Keyboard first. The cursor lives in one of two zones — the project tree or
 * the active view's table — and Tab moves between them; the tool windows are
 * numbered the way IntelliJ numbers them, so ⌘1…⌘6 (and the bare digits when
 * nothing is focused) open 1 Projects … 6 Chat.
 *
 * Every binding here has a row in the help sheet (client-help.ts).
 */
export const CLIENT_KEYS_JS = `
var PANEL_KEYS = { "2": "runs", "3": "docs", "4": "brain",
	o: "attention", r: "runs", d: "docs", b: "brain" };
var MD_KEYS = { p: "preview", s: "split", R: "raw" };

/** 1 Projects, 2 Runs, 3 Docs, 4 Brain, 5 Find, 6 Chat. */
function toolWindow(n) {
	if (n === "1") toggleSide();
	else if (n === "5") toggleFind();
	else if (n === "6") toggleChat();
	else openPanel(PANEL_KEYS[n]);
}

function isTyping(el) {
	if (!el) return false;
	var tag = el.tagName;
	return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * The chorded half: these fire even while a field has focus.
 *
 * ⌘W is deliberately NOT here. Chrome and Firefox reserve it and ignore
 * preventDefault, so binding it closed the browser tab — the whole workbench
 * session — while closeTab's pinned-tab guard meant it often did nothing
 * in-app at all. The bare \`w\` at the bottom of this file is the close
 * gesture, and it is the only one the help sheet advertises.
 */
function modKey(e) {
	var key = e.key.toLowerCase();
	// ⌘⇧F is IntelliJ's Find in Files and always opens the panel. Plain ⌘F is
	// IntelliJ's find in the DOCUMENT, and ah has no in-document find — so on
	// a document tab, or while a field has focus, it is left to the browser,
	// which does. Swallowing it everywhere meant a long journal could not be
	// searched at all.
	if (key === "f") {
		if (!e.shiftKey && findsInDocument()) return false;
		focusFind();
		return true;
	}
	if (!e.shiftKey && /^[1-6]$/.test(e.key)) { toolWindow(e.key); return true; }
	return false;
}

/** Tabs whose body is prose the browser's own find can search. */
var DOC_TABS = { doc: 1, file: 1, run: 1 };
function findsInDocument() {
	var t = activeTab();
	return isTyping(document.activeElement) || !!(t && DOC_TABS[t.kind]);
}

document.addEventListener("keydown", function (e) {
	if ((e.metaKey || e.ctrlKey) && !e.altKey && modKey(e)) { e.preventDefault(); return; }
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
	if (/^[1-6]$/.test(e.key)) { toolWindow(e.key); return; }
	if (Object.prototype.hasOwnProperty.call(PANEL_KEYS, e.key)) {
		// openPanel, not togglePanel: a panel key means the whole panel, with
		// no filter left over from a drill-in.
		openPanel(PANEL_KEYS[e.key]);
		return;
	}
	// p / s / R only mean anything on a markdown tab; elsewhere they fall through.
	if (Object.prototype.hasOwnProperty.call(MD_KEYS, e.key) && setActiveMdMode(MD_KEYS[e.key])) {
		e.preventDefault();
		return;
	}
	if (e.key === "c") { e.preventDefault(); focusChat(); return; }
	if (e.key === "t") { toggleTheme(); return; }
	if (e.key === "w") { closeActiveTab(); return; }
	if (e.key === "Enter") { e.preventDefault(); openCursor(); return; }
	if (e.key === "j" || e.key === "ArrowDown") moveOrScroll(e, 1);
	else if (e.key === "k" || e.key === "ArrowUp") moveOrScroll(e, -1);
});
`;
