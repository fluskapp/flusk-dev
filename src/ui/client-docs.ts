/**
 * Docs: the markdown ah indexes across your projects as a dense list, and one
 * document rendered in its own tab (the server does the rendering).
 */
export const CLIENT_DOCS_JS = `
var KIND_ORDER = ["context", "plan", "skill", "doc", "readme", "note"];
var lastDocs = [];

function docMatches(a) {
	if (S.docProject && a.project !== S.docProject) return false;
	if (!S.docFilter) return true;
	return (a.title + " " + a.project + " " + a.kind + " " + a.path)
		.toLowerCase().indexOf(S.docFilter) !== -1;
}

function docRow(a) {
	return '<tr data-open="ref:' + esc(a.path) + '" title="' + esc(a.path) + '">' +
		'<td><span class="kind k-' + esc(a.kind) + '">' + esc(a.kind) + "</span></td>" +
		'<td class="grow">' + esc(a.title) + "</td>" +
		"<td>" + projectLink(a.project) + "</td>" +
		'<td class="num">' + esc(fmtTime(new Date(a.mtimeMs).toISOString())) + "</td></tr>";
}

function docsHead() {
	return '<div class="head-row"><h2>' + (S.docProject ? esc(S.docProject) + " docs" : "Documents") +
		"</h2>" + (S.docProject ? '<span class="ev" data-open="docs:">show all projects</span>' : "") +
		"</div>" +
		'<input id="doc-search" placeholder="Filter documents" value="' + esc(S.docFilter) + '"/>';
}

function renderDocs() {
	var shown = lastDocs.filter(docMatches);
	var groups = {};
	shown.forEach(function (a) { (groups[a.kind] = groups[a.kind] || []).push(a); });
	var body = KIND_ORDER.filter(function (k) { return groups[k]; }).map(function (k) {
		return sec(k, tbl("", groups[k].map(docRow).join("")), groups[k].length);
	}).join("") || line("No document matches this filter.");
	var active = document.activeElement;
	var wasTyping = !!active && active.id === "doc-search";
	$("#docs").innerHTML = docsHead() + body;
	var search = $("#doc-search");
	search.addEventListener("input", function () {
		S.docFilter = this.value.toLowerCase();
		renderDocs();
	});
	if (wasTyping) { search.focus(); search.setSelectionRange(search.value.length, search.value.length); }
}

async function loadDocs() {
	try { lastDocs = await getJson("/api/artifacts"); }
	catch (e) {
		$("#docs").innerHTML = '<div class="empty small">could not read documents</div>';
		return;
	}
	if (!lastDocs.length) {
		$("#docs").innerHTML =
			'<div class="empty small">No markdown indexed.<br/>Set <code>ui.projectDirs</code> in ' +
			"<code>~/.ah/config.json</code>.</div>";
		return;
	}
	renderDocs();
}

async function loadDoc(path) {
	var d;
	try { d = await getJson("/api/artifact?repo=" + encodeURIComponent(path)); }
	catch (e) {
		$("#doc").innerHTML = '<div class="empty small">could not render this document</div>';
		return;
	}
	var fm = Object.keys(d.frontmatter || {}).map(function (k) {
		return '<div class="fm-row"><span class="fm-k">' + esc(k) + "</span><span>" +
			esc(d.frontmatter[k]) + "</span></div>";
	}).join("");
	$("#doc").innerHTML =
		'<div class="doc-head"><b>' + esc(d.title) + "</b>" +
		'<span class="dim">' + esc(d.path) + "</span>" +
		'<div class="meta-actions">' +
		'<button class="act" id="doc-copy">Copy path</button>' +
		'<button class="act" id="doc-nvim">Copy nvim command</button></div></div>' +
		(fm ? '<div class="frontmatter">' + fm + "</div>" : "") +
		'<div class="md">' + d.html + "</div>";
	$("#doc-copy").addEventListener("click", function () { copyText(d.path, "Path copied"); });
	$("#doc-nvim").addEventListener("click", function () {
		copyText('nvim "' + d.path + '"', "Command copied");
	});
}
`;
