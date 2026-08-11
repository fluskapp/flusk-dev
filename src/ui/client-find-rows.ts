/**
 * The Find in Files result TREE: one row per file with its match count, each
 * expanding into its matching lines — a fixed-width line-number gutter and
 * the line itself with the matched span highlighted.
 *
 * The rows are flattened into one indexed list because that list is what the
 * cursor and Enter both address; the tree is presentation.
 */
export const CLIENT_FIND_ROWS_JS = `
/**
 * Escape a matched line, wrapping the hit spans. \`ranges\` are character
 * offsets into the RAW text, so the slicing happens before escaping and the
 * markup can only ever come from this file.
 */
function fxMark(text, ranges) {
	var t = String(text == null ? "" : text), out = "", at = 0;
	(ranges || []).forEach(function (r) {
		var s = Math.max(at, Math.min(t.length, r[0] | 0));
		var e = Math.max(s, Math.min(t.length, r[1] | 0));
		if (e === s) return;
		out += esc(t.slice(at, s)) + '<span class="hit">' + esc(t.slice(s, e)) + "</span>";
		at = e;
	});
	return out + esc(t.slice(at));
}

/** Files are expanded by default; F.open only ever records a collapse. */
function fxOpen(path) { return F.open[path] !== false; }

/**
 * A file node. It is a real tree row for assistive tech too: the twisty's
 * state is \`aria-expanded\`, not only a glyph, it says where it sits among its
 * siblings, and it has an id so the query field can point aria-activedescendant
 * at it — which is how the cursor is announced, since focus stays in the field.
 */
function fxFileRow(r, i) {
	var f = r.file;
	return '<div class="fx-file" role="treeitem" aria-level="1" id="fx-' + i +
		'" aria-posinset="' + r.pos + '" aria-setsize="' + r.size + '" aria-expanded="' +
		(fxOpen(f.path) ? "true" : "false") + '" data-fx="' + i +
		'" title="' + esc(f.path) + '">' +
		'<span class="twisty">' + (fxOpen(f.path) ? "\\u25be" : "\\u25b8") + "</span>" +
		'<span class="glyph">' + esc(fileGlyph(f.path)) + "</span>" +
		'<span class="fx-name">' + esc(base(f.path)) + "</span>" +
		'<span class="fx-dir">' + esc((f.project ? f.project + "  " : "") + dirOf(f.path)) + "</span>" +
		'<span class="fx-count">' + f.matches.length + "</span></div>";
}

function fxLineRow(r, i) {
	return '<div class="fx-line" role="treeitem" aria-level="2" id="fx-' + i +
		'" aria-posinset="' + r.pos + '" aria-setsize="' + r.size + '" data-fx="' + i +
		'" title="' + esc(r.file.path + ":" + r.m.line) + '">' +
		'<span class="gutter">' + esc(r.m.line) + "</span>" +
		'<span class="fx-text">' + fxMark(r.m.text, r.m.ranges) + "</span></div>";
}

/** The visible rows in order — what the cursor indexes. \`pos\`/\`size\` are a
 * row's place among its SIBLINGS, which is what a treeitem has to state. */
function findRowList() {
	var rows = [], files = (F.result && F.result.files) || [];
	files.forEach(function (f, fi) {
		rows.push({ kind: "file", file: f, pos: fi + 1, size: files.length });
		if (!fxOpen(f.path)) return;
		f.matches.forEach(function (m, mi) {
			rows.push({ kind: "line", file: f, m: m, pos: mi + 1, size: f.matches.length });
		});
	});
	return rows;
}

function renderFindResults() {
	var host = $("#find-results");
	F.rows = findRowList();
	if (F.result === null) {
		host.innerHTML = '<div class="fx-empty" role="presentation">' +
			"Type to search every configured project.</div>";
		syncFindCursor();
		return;
	}
	if (!F.rows.length) {
		host.innerHTML = '<div class="fx-empty" role="presentation">No matches for \\u201c' + esc(F.q) + "\\u201d" +
			(F.result.note ? ' <span class="dim">\\u2014 ' + esc(F.result.note) + "</span>" : "") + "</div>";
		syncFindCursor();
		return;
	}
	host.innerHTML = F.rows.map(function (r, i) {
		return r.kind === "file" ? fxFileRow(r, i) : fxLineRow(r, i);
	}).join("");
	syncFindCursor();
}

/**
 * The cursor IS the tree's selection: one filled row. Whether that fill is
 * the focused or the inactive colour is the stylesheet's business (it reads
 * :focus-within on the panel), never a second class. The query field holds the
 * keyboard throughout, so it is the field that points at the selected row.
 */
function syncFindCursor() {
	$$("#find-results [data-fx]").forEach(function (el, i) {
		el.classList.toggle("on", i === F.cursor);
		el.setAttribute("aria-selected", i === F.cursor ? "true" : "false");
	});
	var q = $("#find-q"), on = F.rows[F.cursor];
	if (on) q.setAttribute("aria-activedescendant", "fx-" + F.cursor);
	else q.removeAttribute("aria-activedescendant");
}

function moveFind(delta) {
	if (!F.rows.length) return;
	F.cursor = Math.max(0, Math.min(F.rows.length - 1, F.cursor + delta));
	syncFindCursor();
	var el = $$("#find-results [data-fx]")[F.cursor];
	if (el) el.scrollIntoView({ block: "nearest" });
}

function toggleFindFile(path) {
	F.open[path] = !fxOpen(path);
	renderFindResults();
}

/** Enter, or a click: a file row folds, a match row opens the file at it. */
function openFindRow(i) {
	var r = F.rows[i];
	if (!r) return;
	if (r.kind === "file") { toggleFindFile(r.file.path); return; }
	openFile(r.file.path, r.m.line, r.file.project);
}

function findClick(e) {
	var el = e.target.closest ? e.target.closest("[data-fx]") : null;
	if (!el) return;
	F.cursor = Number(el.getAttribute("data-fx"));
	openFindRow(F.cursor);
	syncFindCursor();
}
`;
