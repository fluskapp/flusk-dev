/** Transcript rendering for the run view. Plain JS shipped as a string. */
export const CLIENT_DETAIL_JS = `
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
	return '<div class="msg assistant"><div class="msg-tag">ah</div>' +
		'<div class="msg-body">' + text + tools + err + "</div></div>";
}

function statsHtml(s) {
	if (!s) return '<div class="running-note">session in progress\\u2026</div>';
	return '<div class="stats">' + s.turns + " turns \\u00b7 " + fmtCost(s.usage.costUsd) +
		" \\u00b7 " + s.usage.input + " in / " + s.usage.output + " out tokens</div>";
}
`;
