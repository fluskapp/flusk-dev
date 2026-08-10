/**
 * The "Docs" panel: every markdown file ah indexes across your projects —
 * context files, plans, skills, docs — with a rendered preview beside the
 * list, which is what aihub's artifact browser did.
 */
export const CLIENT_DOCS_JS = `
var openDoc = null;
var docFilter = "";

var KIND_ORDER = ["context", "plan", "skill", "doc", "readme", "note"];

function docRow(a) {
	return '<div class="doc-row' + (a.path === openDoc ? " active" : "") + '" data-p="' + esc(a.path) + '">' +
		'<span class="kind k-' + esc(a.kind) + '">' + esc(a.kind) + "</span>" +
		'<span class="doc-title">' + esc(a.title) + "</span>" +
		'<span class="dim small">' + esc(a.project) + "</span></div>";
}

function matchesDoc(a) {
	if (!docFilter) return true;
	return (a.title + " " + a.project + " " + a.kind + " " + a.path).toLowerCase().indexOf(docFilter) !== -1;
}

async function loadDocs() {
	var list;
	try {
		list = await (await fetch("/api/artifacts")).json();
	} catch (e) {
		$("#docs").innerHTML = '<div class="empty small">could not read documents</div>';
		return;
	}
	if (!list.length) {
		$("#docs").innerHTML =
			'<div class="empty small">No markdown indexed.<br/>Set <code>ui.projectDirs</code> in ' +
			"<code>~/.ah/config.json</code>.</div>";
		return;
	}
	var shown = list.filter(matchesDoc);
	var groups = {};
	shown.forEach(function (a) { (groups[a.kind] = groups[a.kind] || []).push(a); });
	var listHtml = KIND_ORDER.filter(function (k) { return groups[k]; }).map(function (k) {
		return '<div class="group-h">' + esc(k) + '<span class="count">' + groups[k].length + "</span></div>" +
			groups[k].map(docRow).join("");
	}).join("");
	$("#docs").innerHTML =
		'<div class="docs-split"><div class="docs-list">' +
		'<input id="doc-search" placeholder="Filter documents" value="' + esc(docFilter) + '"/>' +
		listHtml + '</div><div class="docs-preview" id="doc-preview">' +
		(openDoc ? "loading\\u2026" : '<div class="empty small">Select a document</div>') + "</div></div>";

	Array.prototype.forEach.call(document.querySelectorAll("#docs .doc-row"), function (el) {
		el.addEventListener("click", function () {
			openDoc = el.getAttribute("data-p");
			loadDocs();
		});
	});
	var search = $("#doc-search");
	search.addEventListener("input", function () { docFilter = this.value.toLowerCase(); loadDocs(); });
	if (docFilter) { search.focus(); search.setSelectionRange(search.value.length, search.value.length); }

	if (openDoc) {
		try {
			var d = await (await fetch("/api/artifact?repo=" + encodeURIComponent(openDoc))).json();
			var fm = Object.keys(d.frontmatter || {}).map(function (k) {
				return '<div class="fm-row"><span class="fm-k">' + esc(k) + "</span><span>" +
					esc(d.frontmatter[k]) + "</span></div>";
			}).join("");
			$("#doc-preview").innerHTML =
				'<div class="doc-head"><b>' + esc(d.title) + "</b>" +
				'<span class="dim small">' + esc(d.path) + "</span>" +
				'<div class="meta-actions">' +
				'<button class="act" id="doc-copy">Copy path</button>' +
				'<button class="act" id="doc-nvim">Copy nvim command</button></div></div>' +
				(fm ? '<div class="frontmatter">' + fm + "</div>" : "") +
				'<div class="md">' + d.html + "</div>";
			$("#doc-copy").addEventListener("click", function () { copyText(d.path, "Path copied"); });
			$("#doc-nvim").addEventListener("click", function () {
				copyText('nvim "' + d.path + '"', "Command copied");
			});
		} catch (e) {
			$("#doc-preview").innerHTML = '<div class="empty small">could not render this document</div>';
		}
	}
}

$("#docs-btn").addEventListener("click", function () { togglePanel("docs"); });
`;
