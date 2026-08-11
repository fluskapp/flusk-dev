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

/**
 * One document, RENDERED — with the frontmatter as a property table and the
 * [Preview | Split | Raw] control in the tab's toolbar. /api/artifact serves
 * markdown already rendered; when it also carries the source, Split and Raw
 * light up, and until then they say why they are off rather than lying.
 */
async function loadDoc(path) {
	setStatusPath(path);
	var d;
	try { d = await getJson("/api/artifact?repo=" + encodeURIComponent(path)); }
	catch (e) {
		$("#doc").innerHTML = '<div class="empty small">could not render this document</div>';
		return;
	}
	setStatusPath(d.path);
	mdSurface($("#doc"), {
		id: "doc:" + path, title: d.title, path: d.path,
		html: fmTable(d.frontmatter) + d.html,
		text: typeof d.text === "string" ? d.text : "",
		actions: pathActions(),
		wire: function () { wirePathActions("#doc", d.path); },
	});
}
`;
