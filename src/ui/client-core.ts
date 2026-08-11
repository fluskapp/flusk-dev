/**
 * Shared client vocabulary: the one state object, DOM helpers, escaping,
 * formatting, and the small HTML builders every view is written in. Plain JS
 * shipped as a string — no template literals inside.
 */
export const CLIENT_CORE_JS = `
var S = {
	projects: [], project: null, expanded: {}, query: "",
	tabs: [], active: null, cursor: 0, zone: "tree",
	runFilter: null, runSort: null, docFilter: "", docProject: null,
	/** The URL the Web panel is reading; null means show its reading list. */
	webUrl: null,
	chat: { msgs: [], busy: false, abort: null },
	/** The path the status bar is showing — the active tab's file. */
	path: "",
};

/** Find in Files state. One object, so a late response can check its seq. */
var F = {
	q: "", scope: "project", mask: "", cs: false, re: false,
	result: null, open: {}, rows: [], cursor: -1, seq: 0, timer: 0, slow: 0, ac: null,
};

function $(s) { return document.querySelector(s); }
function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
function esc(s) {
	return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
	});
}
function base(p) { var parts = String(p == null ? "" : p).split("/"); return parts[parts.length - 1] || String(p); }
function dirOf(p) {
	var s = String(p == null ? "" : p), i = s.lastIndexOf("/");
	return i === -1 ? "" : s.slice(0, i + 1);
}
function ext(p) { var m = /\\.([\\w+#-]+)$/.exec(String(p == null ? "" : p)); return m ? m[1].toLowerCase() : ""; }
function isMd(p) { return ext(p) === "md" || ext(p) === "markdown"; }
function fmtCost(n) { return "$" + (Math.round((n || 0) * 10000) / 10000); }
function fmtTime(iso) {
	if (!iso) return "";
	var d = new Date(iso);
	if (isNaN(d.getTime())) return String(iso);
	return d.toLocaleString(undefined,
		{ month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
/** "blocked" gets its own class: the attention rules rate it MEDIUM, so
 * painting it the same red as a failure makes the two views contradict. */
function statusClass(s) {
	if (s === "done" || s === "completed" || s === "ok" || s === "passed") return "completed";
	if (s === "failed" || s === "error") return "error";
	if (s === "blocked") return "blocked";
	if (s === "running" || s === "active") return "running";
	return "stopped";
}
function pill(status) {
	return '<span class="pill ' + statusClass(status) + '">' + esc(status || "unknown") + "</span>";
}
function sec(title, body, count) {
	return '<section class="sec"><h3>' + esc(title) +
		(count == null ? "" : '<span class="count">' + esc(count) + "</span>") +
		"</h3>" + body + "</section>";
}
function line(text, calm) {
	return '<div class="line' + (calm ? " calm" : "") + '">' + esc(text) + "</div>";
}
function emptyRow(text) { return line(text); }
function tbl(head, rows) {
	return '<table class="tbl">' + (head ? "<thead>" + head + "</thead>" : "") +
		"<tbody>" + rows + "</tbody></table>";
}
/** An <a>-like handle onto evidence; the delegated click handler reads it. */
function evidence(text, ref, cls) {
	return '<span class="ev ' + (cls || "") + '" data-open="ref:' + esc(ref) + '">' + esc(text) + "</span>";
}
function projectLink(name) {
	return '<span class="ev" data-open="project:' + esc(name) + '">' + esc(name) + "</span>";
}

/**
 * \`opts\` carries an AbortSignal, so a superseded search can be cancelled.
 *
 * A REJECTION CARRIES THE REASON. Every route in this server answers a failure
 * with {error: "…"}; throwing the status alone destroyed that sentence at the
 * fetch boundary and left each caller to invent one — which is how a panel ends
 * up asserting "that path is outside your projects" about a 500. \`status\` is 0
 * when the request never landed at all, which is a third thing again.
 */
async function getJson(url, opts) {
	var r = await fetch(url, opts || undefined);
	if (r.ok) return r.json();
	var body = null;
	try { body = await r.json(); } catch (e) { body = null; }
	var err = new Error("HTTP " + r.status);
	err.status = r.status;
	err.reason = (body && body.error) || "";
	throw err;
}

/** The one sentence a failed getJson is worth, never a guess about the cause. */
function failWhy(e) {
	if (e && e.reason) return e.reason;
	if (e && e.status) return "the server answered HTTP " + e.status;
	return "the dashboard could not reach the server (" + String((e && e.message) || e) + ")";
}

/**
 * Markdown and syntax highlighting live on the SERVER (escaping is their
 * security invariant, and a second implementation here would be a second
 * place to get it wrong). Anything holding text posts it to /api/render.
 */
async function postRender(text, lang) {
	var r = await fetch("/api/render", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ text: String(text == null ? "" : text), lang: lang || "" }),
	});
	if (!r.ok) throw new Error("HTTP " + r.status);
	return (await r.json()).html;
}

function toast(msg) {
	var t = $("#toast");
	t.textContent = msg;
	t.hidden = false;
	clearTimeout(window.__toastT);
	window.__toastT = setTimeout(function () { t.hidden = true; }, 1800);
}
async function copyText(text, label) {
	try { await navigator.clipboard.writeText(text); toast(label || "Copied"); }
	catch (e) { toast("Copy failed"); }
}

function toggleTheme() {
	var cur = document.documentElement.getAttribute("data-theme");
	var osDark = matchMedia("(prefers-color-scheme: dark)").matches;
	var next = cur === "dark" ? "light" : cur === "light" ? "dark" : osDark ? "light" : "dark";
	document.documentElement.setAttribute("data-theme", next);
	localStorage.setItem("ah-theme", next);
}

/** Session key, harness journal, or indexed document — decided by shape. */
function refKind(ref) {
	if (/\\.jsonl$/.test(ref)) return "session";
	if (ref.indexOf("/docs/runs/") !== -1) return "journal";
	if (/\\.md$/.test(ref)) return "doc";
	return "journal";
}
`;
