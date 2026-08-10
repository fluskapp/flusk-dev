/** Sidebar, search filter, polling. Plain JS shipped as a string. */
export const CLIENT_LIST_JS = `
var current = null;
var brainOpen = false;
var runsOpen = false;
var docsOpen = false;
var lastListJson = "";
var lastList = [];
var query = "";
function $(s) { return document.querySelector(s); }
function esc(s) {
	return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
	});
}
function base(p) { var parts = String(p).split("/"); return parts[parts.length - 1] || p; }
function fmtCost(n) { return "$" + (Math.round((n || 0) * 10000) / 10000); }
function fmtTime(iso) {
	return new Date(iso).toLocaleString(undefined,
		{ month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function matches(s) {
	if (!query) return true;
	return (s.task + " " + base(s.repoRoot) + " " + s.status).toLowerCase().indexOf(query) !== -1;
}

function renderList(list) {
	lastList = list;
	var shown = list.filter(matches);
	var byRepo = {};
	shown.forEach(function (s) { (byRepo[s.repoRoot] = byRepo[s.repoRoot] || []).push(s); });
	var html = "";
	Object.keys(byRepo).sort().forEach(function (repo) {
		var rows = byRepo[repo];
		html += '<div class="group"><div class="group-h">' + esc(base(repo)) +
			'<span class="count">' + rows.length + "</span></div>";
		rows.forEach(function (s) {
			html += '<div class="row' + (s.key === current ? " active" : "") +
				'" data-k="' + esc(s.key) + '"><span class="dot ' + esc(s.status) + '"></span>' +
				'<div class="row-main"><div class="row-task" title="' + esc(s.task) + '">' + esc(s.task) + "</div>" +
				'<div class="row-sub">' + esc(fmtTime(s.createdAt)) + " \\u00b7 " + s.turns +
				" turns \\u00b7 " + fmtCost(s.costUsd) + "</div></div></div>";
		});
		html += "</div>";
	});
	$("#list").innerHTML = html || (query
		? '<div class="empty small">No matches for \\u201c' + esc(query) + '\\u201d</div>'
		: '<div class="empty small">No sessions yet.<br/>Run: <code>ah run "task"</code></div>');
	$("#count").textContent = shown.length + (query ? "/" + list.length : "") +
		" session" + (list.length === 1 ? "" : "s");
	Array.prototype.forEach.call(document.querySelectorAll("#list .row"), function (el) {
		el.addEventListener("click", function () { select(el.getAttribute("data-k")); });
	});
}

async function loadList(force) {
	try {
		var r = await fetch("/api/sessions");
		var text = await r.text();
		if (!force && text === lastListJson) return;
		lastListJson = text;
		var list = JSON.parse(text);
		renderList(list);
		if (!current && list.length) select(list[0].key); // newest first
	} catch (e) { /* server briefly gone; next poll retries */ }
}

function select(k) {
	current = k;
	history.replaceState(null, "", "#" + encodeURIComponent(k));
	loadDetail(true);
	loadList(true);
}

function toggleTheme() {
	var cur = document.documentElement.getAttribute("data-theme");
	var osDark = matchMedia("(prefers-color-scheme: dark)").matches;
	var next = cur === "dark" ? "light" : cur === "light" ? "dark" : osDark ? "light" : "dark";
	document.documentElement.setAttribute("data-theme", next);
	localStorage.setItem("ah-theme", next);
}

(function init() {
	var saved = localStorage.getItem("ah-theme");
	if (saved) document.documentElement.setAttribute("data-theme", saved);
	$("#theme").addEventListener("click", toggleTheme);
	var hash = location.hash.slice(1);
	if (hash) { current = decodeURIComponent(hash); loadDetail(true); }
	loadList(false);
	setInterval(function () { loadList(false); }, 4000);
	setInterval(function () {
		if (current && window.__ahStatus === "running") loadDetail(false);
	}, 4000);
})();
`;
