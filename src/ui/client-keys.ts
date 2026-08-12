/**
 * Keyboard first. The cursor lives in one of two zones — the project tree or
 * the active view's table — and Tab moves between them; the tool windows are
 * numbered the way IntelliJ numbers them, so ⌘1…⌘6 (and the bare digits when
 * nothing is focused) open 1 Projects … 7 Documentation.
 *
 * Every binding here has a row in the help sheet (client-help.ts), and the
 * digit patterns admit exactly the numbers that open something: a key with no
 * tool window behind it must keep its browser meaning rather than be swallowed
 * by a preventDefault that then does nothing.
 */
export const CLIENT_KEYS_JS = `
var PANEL_KEYS = { "2": "runs", "3": "docs",
	o: "attention", r: "runs", d: "docs" };
var MD_KEYS = { p: "preview", s: "split", R: "raw" };

/** 1 Projects, 2 Runs, 3 Docs, 4 Find, 5 Chat, 6 Documentation. */
function toolWindow(n) {
	if (n === "1") toggleSide();
	else if (n === "4") toggleFind();
	else if (n === "5") toggleChat();
	else if (n === "6") docQuick();
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
	// IntelliJ's find in the DOCUMENT, and flusk has no in-document find — so on
	// a document tab, or while a field has focus, it is left to the browser,
	// which does. Swallowing it everywhere meant a long journal could not be
	// searched at all.
	if (key === "f") {
		if (!e.shiftKey && findsInDocument()) return false;
		focusFind();
		return true;
	}
	// IntelliJ's Go to Declaration and File Structure. Neither is a browser
	// default that would be missed: ⌘B/Ctrl+B is unbound in Chrome and Safari
	// (Firefox's bookmarks sidebar is ⌘⇧B), and DevTools opens on bare F12 or
	// ⌘⌥I, never on ⌘F12 — so preventDefault is honoured. ⌘B is left alone
	// while a field has focus, where it may still mean "bold".
	//
	// The SHIFT GUARDS keep the sentence above true. e.key is lower-cased, so
	// ⌘⇧B arrived here as "b" and ⌘⇧F12 as "f12", and both were swallowed with
	// preventDefault — including the bookmarks shortcut this comment claims is
	// left free in every browser that has one.
	if (key === "b" && !e.shiftKey && !isTyping(document.activeElement)) {
		docGoToDefinition();
		return true;
	}
	if (key === "f12" && !e.shiftKey) { focusOutline(); return true; }
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
	// ⌥F7 is IntelliJ's Find Usages and no browser binds it; it has to be read
	// before the bail-out below, which drops everything holding a modifier.
	if (e.altKey && e.key === "F7") { e.preventDefault(); docFindUsages(); return; }
	// F1 is IntelliJ's Quick Documentation and it DOES a lookup here rather than
	// toggling a rail: on the identifier last clicked it documents that symbol,
	// and only falls back to showing the panel when there is nothing to look up.
	// Pressing it on a symbol used to CLOSE the panel, which is the opposite verb.
	//
	// It is a SECONDARY binding, not the advertised one: macOS maps F1 to
	// brightness-down unless "Use F1, F2, etc. keys as standard function keys"
	// is on, so on this platform the keycode usually never reaches the browser.
	// The help sheet and the toolbar tooltip lead with 6 / ⌘6 for that reason.
	if (e.key === "F1") { e.preventDefault(); docQuick(); return; }
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
