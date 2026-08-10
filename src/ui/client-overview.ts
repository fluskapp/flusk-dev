/** The Overview panel: stat tiles, recent activity, repos and harnesses. */
export const CLIENT_OVERVIEW_JS = `
var overviewOpen = false;

function showPanel(name) {
	overviewOpen = name === "overview";
	runsOpen = name === "runs";
	brainOpen = name === "brain";
	docsOpen = name === "docs";
	var any = name !== null;
	$("#overview").hidden = !overviewOpen;
	$("#runs").hidden = !runsOpen;
	$("#brain").hidden = !brainOpen;
	$("#docs").hidden = !docsOpen;
	$("#detail").hidden = any || !current;
	$("#empty").hidden = any || !!current;
	[["overview", overviewOpen], ["runs", runsOpen], ["brain", brainOpen], ["docs", docsOpen]]
		.forEach(function (p) { $("#" + p[0] + "-btn").classList.toggle("on", p[1]); });
	if (overviewOpen) loadOverview();
	if (runsOpen) loadRuns();
	if (brainOpen) loadBrain();
	if (docsOpen) loadDocs();
}

function togglePanel(name) {
	var open = { overview: overviewOpen, runs: runsOpen, brain: brainOpen, docs: docsOpen }[name];
	showPanel(open ? null : name);
}

function statHtml(s) {
	return '<div class="stat"><div class="stat-v">' + esc(s.value) + "</div>" +
		'<div class="stat-l">' + esc(s.label) + "</div>" +
		(s.hint ? '<div class="stat-h">' + esc(s.hint) + "</div>" : "") + "</div>";
}

function activityHtml(a) {
	return '<div class="act"><span class="pill ' + statusClass(a.status) + '">' + esc(a.status) + "</span>" +
		'<span class="act-kind">' + (a.kind === "run" ? "run" : "session") + "</span>" +
		"<span>" + esc(a.title) + "</span>" +
		'<span class="dim small">' + esc(a.where) + " \\u00b7 " + esc(fmtTime(a.at)) + "</span></div>";
}

async function loadOverview() {
	var d;
	try {
		d = await (await fetch("/api/overview")).json();
	} catch (e) {
		$("#overview").innerHTML = '<div class="empty small">could not load overview</div>';
		return;
	}
	var repos = d.repos.map(function (r) {
		return '<div class="fact"><code>' + esc(r.name) + "</code>" +
			'<span class="dim small">' + r.sessions + " session" + (r.sessions === 1 ? "" : "s") +
			" \\u00b7 $" + (Math.round(r.costUsd * 10000) / 10000) + "</span></div>";
	}).join("") || emptyRow("no sessions yet");
	var harnesses = d.harnesses.map(function (h) {
		return '<div class="fact"><code>' + esc(h.name) + "</code>" +
			(h.live ? '<span class="pill running">' + h.live + " live</span>" : "") +
			'<span class="dim small">' + h.runs + " runs</span></div>";
	}).join("") || emptyRow("no harness journals found");
	$("#overview").innerHTML =
		'<div class="stats-row">' + d.stats.map(statHtml).join("") + "</div>" +
		section("Recent activity", d.activity.map(activityHtml).join("") || emptyRow("nothing yet")) +
		section("Repositories", repos) +
		section("Harnesses", harnesses);
}

$("#overview-btn").addEventListener("click", function () { togglePanel("overview"); });
setInterval(function () { if (overviewOpen) loadOverview(); }, 5000);
`;
