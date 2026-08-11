/**
 * The landing view. It answers "what needs me?" — the attention list first,
 * then what is live, then recent activity. When nothing needs a human it says
 * so in one line instead of padding the page with tiles.
 */
export const CLIENT_ATTENTION_JS = `
function attentionItems() {
	var rows = [];
	S.projects.forEach(function (p) {
		(p.attention || []).forEach(function (a) { rows.push({ project: p.name, a: a }); });
	});
	return rows.filter(function (r) { return r.a.severity === "high"; })
		.concat(rows.filter(function (r) { return r.a.severity !== "high"; }));
}

function attentionRow(r) {
	var a = r.a;
	return '<tr class="attn-row"' + (a.ref ? ' data-open="ref:' + esc(a.ref) + '"' : "") + ">" +
		'<td><span class="sev ' + esc(a.severity) + '"></span></td>' +
		'<td class="grow">' + esc(a.label) + "</td>" +
		"<td>" + projectLink(r.project) + "</td>" +
		'<td class="mono">' + (a.ref ? evidence(base(a.ref), a.ref) : "\\u2014") + "</td></tr>";
}

function calmLine() {
	var live = S.projects.reduce(function (n, p) { return n + p.liveRuns; }, 0);
	return line("Nothing needs attention \\u2014 " + S.projects.length + " project" +
		(S.projects.length === 1 ? "" : "s") + ", " + live + " run" + (live === 1 ? "" : "s") +
		" in flight.", true);
}

/** The accent styling is the promise that a tile leads somewhere; a tile with
 * no "open" gets neither, so nothing in the row is clickable-looking and inert. */
function statTile(value, label, hint, open) {
	return '<div class="stat"' + (open ? ' data-open="' + esc(open) + '"' : "") + ">" +
		'<div class="stat-v' + (open ? " ev" : "") + '">' + esc(value) + "</div>" +
		'<div class="stat-l">' + esc(label) + "</div>" +
		(hint ? '<div class="stat-h">' + esc(hint) + "</div>" : "") + "</div>";
}

function attentionStats(runs) {
	var live = runs.filter(function (r) { return r.status === "running"; }).length;
	var docs = S.projects.reduce(function (n, p) { return n + p.docs; }, 0);
	var spend = S.projects.reduce(function (n, p) { return n + (p.costUsd || 0); }, 0);
	var attn = attentionItems().length;
	return '<div class="stats-row">' +
		// "need attention" counts the list directly below it: nowhere to go.
		statTile(String(attn), "need attention", "listed below", null) +
		statTile(String(live), "live now", "runs in flight", "tab:runs") +
		statTile(String(runs.length), "recent runs", "sessions + journals", "tab:runs") +
		statTile(String(docs), "documents", "indexed markdown", "tab:docs") +
		// ...and spend leads to the runs that make it up, priciest first —
		// not to a per-project memory view that shows no costs at all.
		statTile(fmtCost(spend), "spend", "runs by cost", "spend:") +
		"</div>";
}

async function loadAttention() {
	if (!S.projects.length) await loadProjects(true);
	var runs = [];
	try { runs = await getJson("/api/runs?limit=60"); } catch (e) { runs = []; }
	var items = attentionItems();
	var attnBody = items.length
		? tbl("", items.map(attentionRow).join(""))
		: calmLine();
	var liveRuns = runs.filter(function (r) { return r.status === "running"; });
	var liveBody = liveRuns.length
		? tbl(runHead(true), liveRuns.map(function (r) { return runRow(r, true); }).join(""))
		: line("Nothing is running.");
	var recent = runs.filter(function (r) { return r.status !== "running"; }).slice(0, 20);
	var recentBody = recent.length
		? tbl(runHead(true), recent.map(function (r) { return runRow(r, true); }).join(""))
		: line("No runs recorded yet. Try: ah run \\"task\\"");
	$("#overview").innerHTML = attentionStats(runs) +
		sec("Needs attention", attnBody, items.length || null) +
		sec("Live runs", liveBody, liveRuns.length || null) +
		sec("Recent activity", recentBody);
}
`;
