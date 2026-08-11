/**
 * How the palette paints a history hit: one dense row, grouped by kind, with
 * the query's terms marked. Split from client-palette.ts because the palette
 * now has two modes and each owns its own rows — this file is the history
 * half, client-goto.ts is the Go-to-File half.
 */
export const PALETTE_ROWS_JS = `
/** Marks matched terms BEFORE escaping, so a term can never eat an entity. */
function palMark(text, terms) {
	var raw = String(text == null ? "" : text);
	(terms || []).forEach(function (t) {
		var word = String(t).replace(/[^a-z0-9_]/gi, "");
		if (word.length > 1) raw = raw.replace(new RegExp("(" + word + ")", "gi"), "\\u0001$1\\u0002");
	});
	return esc(raw).split("\\u0001").join("<mark>").split("\\u0002").join("</mark>");
}

function palRow(h, i, group) {
	return (group ? '<div class="pal-group">' + esc(h.card.kind) + "s</div>" : "") +
		'<div class="pal-row' + (i === P.cur ? " on" : "") + '" data-i="' + i + '">' +
		'<span class="glyph">' + esc(h.card.kind) + "</span>" +
		'<span class="pal-title">' + palMark(h.card.title, h.terms) + '</span><span class="pal-meta">' +
		esc(h.card.project) + DOT + esc(h.card.at.slice(0, 10)) + "</span></div>";
}

function palRender() {
	var last = "";
	var rows = P.hits.map(function (h, i) {
		var row = palRow(h, i, h.card.kind !== last);
		last = h.card.kind;
		return row;
	}).join("");
	$("#pal-list").innerHTML = rows || '<div class="pal-empty">' +
		(P.q ? "No matches for " + esc(P.q) : "Type to search everything that already happened") + "</div>";
}

/** Repaint whichever mode the palette is in. */
function palPaint() {
	if (P.mode === "files") goRender();
	else palRender();
}
`;
