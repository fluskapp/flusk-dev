/**
 * The project view: the harness at a glance — what it needs a human for, the
 * models it routes to (with learned scores when it keeps them), the tools it
 * can call, the commands it gates on, and the prompt it runs on.
 */
export const CLIENT_PROJECT_JS = `
function projectCounts(d) {
	return '<div class="stats-row">' +
		statTile(String(d.runs), "runs", "sessions + journals", "runs:" + d.name) +
		statTile(String(d.liveRuns), "live", "in flight", "runs:" + d.name) +
		statTile(String(d.sessions), "ah sessions", "recorded here", "runs:" + d.name) +
		statTile(String(d.docs), "documents", "indexed markdown", "docs:" + d.name) +
		// A harness journal only contributes cost when it declares one, so $0
		// here means "nothing recorded", never "this was free". Say which.
		statTile(fmtCost(d.costUsd), "spend",
			d.costUsd > 0 ? "sessions + journals" : "no cost recorded", "spend:") +
		"</div>";
}

function modelRow(m) {
	return "<tr><td class=\\"mono\\">" + esc(m.id) + "</td>" +
		"<td>" + (m.role ? esc(m.role) : '<span class="off">\\u2014</span>') + "</td>" +
		'<td class="num">' + (m.score == null ? "" : '<span class="score">' + esc(m.score) + "</span>") +
		"</td></tr>";
}

function promptBlock(p) {
	if (!p) return line("No system prompt found for this project.");
	return '<details class="prompt-block"><summary>System prompt <span class="dim">' +
		esc(p.source) + "</span></summary>" +
		'<pre class="prompt-text code">' + esc(p.text) + "</pre></details>";
}

function configBlock(cfg) {
	var keys = Object.keys(cfg || {});
	if (!keys.length) return line("No declarative config found.");
	return '<details class="config-block"><summary>Config <span class="dim">' +
		keys.length + " key" + (keys.length === 1 ? "" : "s") + "</span></summary>" +
		'<pre class="code out">' + esc(JSON.stringify(cfg, null, 2)) + "</pre></details>";
}

function projectAttention(d) {
	if (!d.attention.length) return line("Nothing needs attention in this project.", true);
	return tbl("", d.attention.map(function (a) {
		return attentionRow({ project: d.name, a: a });
	}).join(""));
}

async function loadProject(name) {
	var d;
	try { d = await getJson("/api/project?name=" + encodeURIComponent(name)); }
	catch (e) {
		$("#project").innerHTML = '<div class="empty small">could not read project ' + esc(name) + "</div>";
		return;
	}
	var verify = d.verify.length
		? tbl("", d.verify.map(function (c) {
			return '<tr><td class="mono grow">' + esc(c) + "</td></tr>";
		}).join(""))
		: line("No verify commands detected.");
	var tools = d.tools.length
		? '<div class="chips">' + d.tools.map(function (t) {
			return '<span class="chip">' + esc(t) + "</span>";
		}).join("") + "</div>"
		: line("No tools declared.");
	var models = d.models.length
		? tbl("<tr><th>model</th><th>role</th><th class=\\"num\\">score</th></tr>",
			d.models.map(modelRow).join(""))
		: line("No models declared.");
	$("#project").innerHTML =
		'<div class="head-row"><h2>' + esc(d.name) + "</h2>" +
		'<span class="kind-chip ' + esc(d.kind) + '">' + esc(d.kind) + "</span>" +
		'<span class="dim">' + esc(d.path) + "</span></div>" +
		projectCounts(d) +
		sec("Needs attention", projectAttention(d), d.attention.length || null) +
		sec("Models", models, d.models.length || null) +
		sec("Tools", tools, d.tools.length || null) +
		sec("Verify", verify, d.verify.length || null) +
		promptBlock(d.systemPrompt) + configBlock(d.config);
}
`;
