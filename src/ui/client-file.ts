/**
 * The file tab — where a search hit and Go-to-File land.
 *
 * What it can show depends on what the server will serve: an indexed document
 * or journal comes back whole and renders (markdown gets the preview control,
 * code gets highlighted); anything else is shown as the lines the search
 * found. Either way, a tab opened AT A LINE carries that line's block with
 * the line marked and scrolled to. It never pretends to a body it was not
 * given: ah serves file contents only for what it indexes.
 */
export const CLIENT_FILE_JS = `
/**
 * Open \`path\` in a tab, scrolled to \`line\` (1-based; 0 means the top).
 * \`project\` is the repo the path came from — the breadcrumb's first crumb,
 * which must be the OWNING project and not whatever the tree has selected.
 */
function openFile(path, line, project) {
	var id = "file:" + path;
	var t = tabById(id) ||
		{ id: id, kind: "file", label: base(path), title: path, ref: path };
	t.line = line || 0;
	if (project) t.project = project;
	openTab(t);
}

/** What Find last found in this file, if anything. */
function matchesFor(path) {
	return ((F.result && F.result.files) || []).filter(function (f) {
		return f.path === path;
	})[0] || null;
}

/**
 * The matching lines, in the editor's gutter, the opened one marked. An elided
 * range carries the same empty gutter cell as a real line, so the gutter is
 * one unbroken column down the peek instead of stopping at every gap.
 */
function peekRows(file, line) {
	var prev = 0;
	var gapRow = '<div class="peek-gap"><span class="gutter"></span>' +
		'<span class="text">\\u22ee</span></div>';
	return file.matches.map(function (m) {
		var gap = prev && m.line > prev + 1 ? gapRow : "";
		prev = m.line;
		return gap + '<div class="peek-row' + (m.line === line ? " hit-line" : "") +
			'" data-line="' + esc(m.line) + '"><span class="gutter">' + esc(m.line) +
			'</span><span class="text">' + fxMark(m.text, m.ranges) + "</span></div>";
	}).join("");
}

/** Above a rendered body: where the hit is, without hiding the document. */
function peekBlock(t) {
	var file = t.line ? matchesFor(t.ref) : null;
	if (!file) return "";
	return '<div class="peek-wrap"><div class="dim small">' + file.matches.length +
		" match" + (file.matches.length === 1 ? "" : "es") + " here \\u00b7 line " + esc(t.line) +
		'</div><div class="peek">' + peekRows(file, t.line) + "</div></div>";
}

function markLine() {
	var mark = $("#file .hit-line");
	if (mark) mark.scrollIntoView({ block: "center" });
}

async function loadFile(t) {
	setStatusPath(t.ref + (t.line ? ":" + t.line : ""));
	var host = $("#file");
	host.innerHTML = '<div class="empty small">opening \\u2026</div>';
	if (isMd(t.ref) && await fileAsDoc(host, t)) return;
	// Source goes to the SYMBOL-AWARE viewer first. Without this line the code
	// viewer, /api/source, the outline strip and the whole Documentation window
	// are unreachable by any user gesture — every tab fell through to a
	// markdown surface, which emits no identifier spans to click.
	if (!isMd(t.ref) && await openCodeInto(host, t.ref, t.line || 0)) return;
	if (await fileAsText(host, t)) return;
	if (await fileAsSource(host, t)) return;
	filePeek(host, t);
}

/**
 * Any other file ah tracks: GET /api/file serves the body, highlighted by the
 * same server-side renderer everything else uses. Without this, Go to File
 * could locate 4,000 source files and open none of them.
 */
async function fileAsSource(host, t) {
	var d;
	try { d = await getJson("/api/file?repo=" + encodeURIComponent(t.ref)); }
	catch (e) { return false; }
	var html = "";
	try { html = await postRender(d.text, isMd(t.ref) ? "md" : ext(t.ref)); }
	catch (e) { return false; }
	if (d.truncated) {
		html += '<div class="empty small">shown to 512KB of ' + esc(d.bytes) + " bytes</div>";
	}
	mdSurface(host, {
		id: "file:" + t.ref, path: d.path, head: peekBlock(t), html: html, text: d.text,
		actions: pathActions(),
		wire: function () { wirePathActions("#file", d.path); markLine(); },
	});
	return true;
}

/** An indexed document: the server renders it, so Raw has no source here. */
async function fileAsDoc(host, t) {
	var d;
	try { d = await getJson("/api/artifact?repo=" + encodeURIComponent(t.ref)); }
	catch (e) { return false; }
	mdSurface(host, {
		id: "file:" + t.ref, title: d.title, path: d.path, head: peekBlock(t),
		html: fmTable(d.frontmatter) + d.html,
		text: typeof d.text === "string" ? d.text : "",
		actions: pathActions(),
		wire: function () { wirePathActions("#file", d.path); markLine(); },
	});
	return true;
}

/** An indexed journal: raw text, so markdown gets Preview / Split / Raw. */
async function fileAsText(host, t) {
	var text = "";
	try {
		var r = await fetch("/api/journal?repo=" + encodeURIComponent(t.ref));
		if (!r.ok) return false;
		text = await r.text();
	} catch (e) { return false; }
	var html = "";
	try { html = await postRender(text, isMd(t.ref) ? "md" : ext(t.ref)); }
	catch (e) { return false; }
	mdSurface(host, {
		id: "file:" + t.ref, path: t.ref, head: peekBlock(t), html: html, text: text,
		actions: pathActions(),
		wire: function () { wirePathActions("#file", t.ref); markLine(); },
	});
	return true;
}
`;
