/** Transcript rendering. Plain JS shipped as a string; no template literals inside. */
export const CLIENT_DETAIL_JS = `
async function loadDetail(userClicked) {
	if (!current) return;
	var d;
	try {
		var r = await fetch("/api/session?k=" + encodeURIComponent(current));
		if (!r.ok) { current = null; history.replaceState(null, "", "/"); return; }
		d = await r.json();
	} catch (e) { return; }
	window.__hitStatus = d.status;
	$("#empty").hidden = true;
	$("#detail").hidden = false;
	var t = d.header.task;
	$("#tab-title").textContent = t.length > 64 ? t.slice(0, 64) + "\\u2026" : t;
	$("#meta").innerHTML = metaHtml(d);
	$("#transcript").innerHTML = d.items.map(itemHtml).join("") + statsHtml(d.stats);
	wireActions(d);
	if (userClicked) $("#main").scrollTop = 0;
}

function wireActions(d) {
	var acts = {
		"copy-path": function () { copyText(d.path, "Path copied"); },
		"copy-nvim": function () { copyText('nvim "' + d.path + '"', "Command copied"); },
		"copy-link": function () {
			copyText(location.origin + "/#" + encodeURIComponent(current), "Link copied");
		},
		"reveal": function () {
			fetch("/api/reveal?k=" + encodeURIComponent(current), { method: "POST" })
				.then(function (r) { toast(r.ok ? "Revealed in Finder" : "Reveal failed"); });
		},
	};
	Array.prototype.forEach.call(document.querySelectorAll("#meta [data-act]"), function (b) {
		b.addEventListener("click", acts[b.getAttribute("data-act")]);
	});
}

function pill(status) { return '<span class="pill ' + esc(status) + '">' + esc(status) + "</span>"; }

function metaHtml(d) {
	var h = d.header;
	return '<span class="meta-item">' + pill(d.status) + "</span>" +
		'<span class="meta-item"><b>' + esc(base(h.repoRoot)) + "</b>" +
		(h.gitBranch ? ' <span class="dim">on</span> ' + esc(h.gitBranch) : "") + "</span>" +
		'<span class="meta-item dim">' + esc(h.model.provider + "/" + h.model.id) + "</span>" +
		'<span class="meta-item dim">#' + esc(h.id) + "</span>" +
		'<span class="meta-item dim">' + esc(fmtTime(h.createdAt)) + "</span>" +
		'<span class="meta-actions">' +
		'<button class="act" data-act="copy-path">Copy path</button>' +
		'<button class="act" data-act="copy-nvim">Copy nvim command</button>' +
		'<button class="act" data-act="reveal">Reveal in Finder</button>' +
		'<button class="act" data-act="copy-link">Copy link</button>' +
		"</span>";
}

function toolHtml(t) {
	var preview = "";
	try { preview = JSON.stringify(t.args) || ""; } catch (e) { preview = ""; }
	if (preview.length > 90) preview = preview.slice(0, 90) + "\\u2026";
	var body = '<pre class="code">' + esc(JSON.stringify(t.args, null, 2)) + "</pre>";
	body += t.output != null
		? '<pre class="code out">' + esc(t.output) + "</pre>"
		: '<div class="dim small pad">no result recorded</div>';
	return '<details class="tool' + (t.isError ? " err" : "") + '"><summary>' +
		'<span class="tool-chip">' + esc(t.name) + "</span>" +
		'<span class="tool-preview">' + esc(preview) + "</span>" +
		(t.isError ? '<span class="tool-flag">failed</span>' : "") +
		"</summary>" + body + "</details>";
}

function itemHtml(it) {
	if (it.kind === "user") {
		return '<div class="msg user"><div class="msg-tag">user</div>' +
			'<div class="msg-body pre">' + esc(it.text) + "</div></div>";
	}
	if (it.kind === "compaction") {
		return '<div class="compaction">context compacted \\u2014 ' +
			esc(it.summary.slice(0, 120)) + "</div>";
	}
	var text = it.text ? '<div class="pre">' + esc(it.text) + "</div>" : "";
	var err = it.errorMessage
		? '<div class="error-line">\\u26a0 ' + esc(it.errorMessage) + "</div>" : "";
	var tools = it.tools.map(toolHtml).join("");
	return '<div class="msg assistant"><div class="msg-tag">hit</div>' +
		'<div class="msg-body">' + text + tools + err + "</div></div>";
}

function statsHtml(s) {
	if (!s) return '<div class="running-note">session in progress\\u2026</div>';
	return '<div class="stats">' + s.turns + " turns \\u00b7 " + fmtCost(s.usage.costUsd) +
		" \\u00b7 " + s.usage.input + " in / " + s.usage.output + " out tokens</div>";
}
`;
