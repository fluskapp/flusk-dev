/**
 * Go to File (⌘⇧O): the palette's second mode. Fuzzy paths come from
 * /api/files — the same `rg --files` listing the server scores — and the
 * characters that matched are marked in each path, so it is obvious WHY a
 * result is a result.
 *
 * The mode is reachable three ways: ⌘⇧O, the mode strip, and a query that
 * starts with "/" (a path is the thing that starts with a slash).
 */
export const PALETTE_FILES_JS = `
/** Mark the subsequence the fuzzy matcher would have consumed, greedily. */
function goMark(path, q) {
	var needle = String(q == null ? "" : q).replace(/\\s+/g, "").toLowerCase();
	var lower = String(path).toLowerCase(), out = "", qi = 0;
	for (var i = 0; i < path.length; i++) {
		var hit = qi < needle.length && lower.charAt(i) === needle.charAt(qi);
		if (hit) qi++;
		out += hit ? "<mark>" + esc(path.charAt(i)) + "</mark>" : esc(path.charAt(i));
	}
	return out;
}

function goRow(h, i) {
	return '<div class="pal-row' + (i === P.cur ? " on" : "") + '" data-i="' + i + '">' +
		'<span class="glyph">' + esc(fileGlyph(h.path)) + "</span>" +
		'<span class="pal-path">' + goMark(h.path, P.q) + "</span>" +
		'<span class="pal-meta">' + esc(h.project || "") + "</span></div>";
}

function goRender() {
	$("#pal-list").innerHTML = P.hits.map(goRow).join("") || '<div class="pal-empty">' +
		(P.q ? "No path matches " + esc(P.q)
			: "Type part of a path \\u2014 \\u201cuicli\\u201d finds src/ui/client-list.ts") + "</div>";
}

function goSearch() {
	var q = $("#pal-q").value.replace(/^\\//, "").trim();
	P.q = q;
	// Guard on the query this request was issued for, the way palSearch does:
	// a slow answer for "ab" arriving after a fast one for "abc" otherwise
	// overwrites the list, and goMark then marks it against the wrong query.
	getJson("/api/files?limit=40" + palScope() + "&q=" + encodeURIComponent(q)).then(function (hits) {
		if (P.mode !== "files" || P.q !== q) return;
		P.hits = hits;
		P.cur = 0;
		goRender();
		palNote(hits.length + " file" + (hits.length === 1 ? "" : "s") + DOT +
			palScopeNote() + DOT + "\\u2318P scope" + DOT + "Enter opens");
	}, function () { palNote("file search failed"); });
}

function goEnter() {
	var h = P.hits[P.cur];
	if (!h) return;
	palOpen(false);
	openFile(h.path, 0, h.project);
}

/** Switch modes: the strip, Tab, or a leading "/" all land here. */
function palSetMode(mode) {
	P.mode = mode;
	P.prompt = null;
	P.card = null;
	P.hits = [];
	P.cur = 0;
	$$("#palette [data-pal]").forEach(function (b) {
		b.classList.toggle("on", b.getAttribute("data-pal") === mode);
	});
	$("#pal-q").placeholder = mode === "files"
		? "Go to file \\u2014 fuzzy path across your projects"
		: "Search history \\u2014 commits, sessions, journals, docs, skills";
	$("#pal-q").focus();
	palSearch();
}

/** \\u2318\\u21e7O: open the palette straight into Go to File. */
function palFiles() {
	palOpen(true);
	palSetMode("files");
}
`;
