/**
 * What one symbol looks like on screen: the sections of the Documentation
 * tool window, in the order IntelliJ reads them — signature, prose, tags,
 * where it is defined, who uses it — and then the section IntelliJ cannot
 * show you at all, RELATED: the commits, runs, sessions and docs that already
 * touched this symbol, each carrying the `why` clause that earned it its row.
 *
 * Split from client-doc.ts (which owns the window: state, keys, wiring) to
 * keep both inside the file-size standard. Two rules hold here:
 *
 *  - EVERY value from the server goes through esc(). The only unescaped HTML
 *    the panel ever inserts is what /api/render returned, which the server
 *    escaped (see markdown.ts and highlight.ts) — client-doc.ts owns that one
 *    insertion, and nothing in this file emits markup from a symbol's name,
 *    a doc comment, a path or a commit subject.
 *  - Every section renders something. A section with no rows says what is
 *    missing in a sentence, because a blank box reads as a broken panel.
 */
export const CLIENT_DOC_ROWS_JS = `
/** A titled block. The title is a literal from this file, never user data. */
function docSec(title, body) {
	return '<section class="dw-sec"><h4>' + title + "</h4>" + body + "</section>";
}

/**
 * The whole body. The signature and the prose are placeholders the async
 * pass fills from /api/render — the signature starts as escaped text, so a
 * failed render degrades to plain source rather than to nothing.
 */
function docSections(p) {
	var doc = p.doc;
	// The server says which files it can serve; every other row is inert.
	DW.openable = p.openable || null;
	return docSec("Signature", '<div class="dw-sig"><pre class="code">' +
			esc(doc.signature) + "</pre></div>") +
		docSec("Documentation", '<div class="dw-doc"></div>') +
		docTags(doc.tags) +
		docSec("Defined in", docDefined(doc.defined)) +
		docSec("Usages", docUses(doc)) +
		docSec("Related", docRelated(p.related, p.note));
}

/** @param / @returns and friends, as a compact definition table. */
function docTags(tags) {
	if (!tags || !tags.length) return "";
	var rows = tags.map(function (t) {
		return '<div class="dw-k">' + esc(t.name) + '</div><div class="dw-v">' +
			esc(t.text) + "</div>";
	}).join("");
	return docSec("Parameters and returns", '<div class="dw-tags">' + rows + "</div>");
}

/** Files this server can serve a body for; null means "it did not say". */
var DW = { openable: null };

/**
 * Can this location be OPENED? Every library symbol resolves into a .d.ts
 * under node_modules, which /api/source, /api/file and /api/artifact all
 * refuse — so a pointer cursor over that row is a promise the workbench
 * cannot keep (styles-work.ts states that rule; this is what keeps it).
 */
function docOpenable(file) {
	return DW.openable === null || DW.openable.indexOf(file) !== -1;
}

/** One file:line. Clickable only when the server said it can serve the file. */
function docLoc(loc) {
	var open = docOpenable(loc.file);
	var inert = '<span class="dw-why">declaration file, outside the indexed sources</span>';
	return '<div class="dw-row' + (open ? "" : " dw-inert") + '"' +
		(open ? ' data-doc="loc:' + esc(loc.line) + '" data-path="' + esc(loc.file) + '"' : "") +
		' title="' + esc(loc.file) + '"><span class="dw-t">' +
		esc(base(loc.file)) + '</span><span class="dw-loc">' + esc(loc.line) + ":" +
		esc(loc.col) + "</span>" + (open ? "" : inert) + "</div>";
}

function docDefined(loc) {
	return loc ? docLoc(loc)
		: '<div class="dw-none">no declaration for this symbol in the indexed sources</div>';
}

/**
 * The count is the true total; the rows are the first few. The full query
 * goes to the Find in Files tool window rather than being re-implemented
 * here — one search surface, one set of bounds, one place to widen it.
 */
function docUses(doc) {
	var refs = doc.references || [];
	var n = doc.referenceCount == null ? refs.length : doc.referenceCount;
	var head = '<div class="dw-count">' + esc(n) + " usage" + (n === 1 ? "" : "s") +
		(doc.truncated ? " \\u00b7 first " + esc(refs.length) + " shown" : "") + "</div>";
	var rows = refs.slice(0, 5).map(docLoc).join("");
	// Named for what it DOES. It is a literal, case-sensitive ripgrep over the
	// configured projects, not a usages query — for a name like "find" or
	// "item" that is a wall of unrelated text, and calling it "usages" while the
	// engine's own exact list sits two rows above is a lie about both.
	return head + (rows || '<div class="dw-none">no usages in the indexed sources</div>') +
		'<div class="dw-row dw-act" data-doc="usages:' + esc(doc.name) +
		'">Search files for ' + esc(doc.name) + " (\\u2325F7)</div>";
}

var DOC_GROUPS = [["commits", "Commits"], ["runs", "Runs and sessions"], ["docs", "Docs and skills"]];

/**
 * The half a language service has no idea about. Each row clicks through to
 * evidence the workbench can already show: a commit to its history card, a
 * run to its journal or session tab, a doc to its rendered tab.
 */
function docRelated(r, note) {
	if (!r) return '<div class="dw-none">' + esc(note || "related history is unavailable") + "</div>";
	var out = DOC_GROUPS.map(function (g) {
		var items = r[g[0]] || [];
		return items.length ? '<h5 class="dw-sub">' + g[1] + "</h5>" +
			items.map(docRelRow).join("") : "";
	}).join("");
	var mentions = r.mentions || 0;
	var foot = '<div class="dw-note">' + esc(mentions) + " literal mention" +
		(mentions === 1 ? "" : "s") + " across your projects" +
		(r.note ? " \\u00b7 " + esc(r.note) : "") + "</div>";
	return (out ||
		'<div class="dw-none">nothing in the history index mentions this symbol yet</div>') + foot;
}

/** A commit has no tab of its own, so it opens its card; the rest are refs. */
function docRelRow(it) {
	// The title travels too: openRef falls back to the basename otherwise, so a
	// run opened from here got a timestamped filename for a tab label instead of
	// the title this very row is already showing.
	return '<div class="dw-row" data-doc="' + (it.kind === "commit" ? "commit:" : "ref:") +
		esc(it.ref) + '" data-title="' + esc(it.title) + '" title="' + esc(it.ref) +
		'"><span class="glyph">' + esc(it.kind) +
		'</span><span class="dw-t">' + esc(it.title) + '</span><span class="dw-why">' +
		esc(it.why) + "</span>" +
		(it.at ? '<span class="dw-at">' + esc(String(it.at).slice(0, 10)) + "</span>" : "") +
		"</div>";
}
`;
