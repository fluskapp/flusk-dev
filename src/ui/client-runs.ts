/**
 * The "Runs" panel: harness run journals (linof-harness, ab, …) with their
 * pipeline stages, polled while a watch autopilot is mid-flight. This is the
 * live view aihub used to provide.
 */
export const CLIENT_RUNS_JS = `
var runsOpen = false;
var openJournal = null;

function toggleRuns() {
	runsOpen = !runsOpen;
	if (runsOpen && brainOpen) toggleBrain();
	$("#runs").hidden = !runsOpen;
	$("#detail").hidden = runsOpen || !current;
	$("#empty").hidden = runsOpen || !!current;
	$("#runs-btn").classList.toggle("on", runsOpen);
	if (runsOpen) loadRuns();
}

var STAGE_CLASS = {
	done: "completed", running: "running", failed: "error",
	error: "error", skipped: "stopped", pending: "",
};

function stageHtml(s) {
	var cls = STAGE_CLASS[s.status] === undefined ? "" : STAGE_CLASS[s.status];
	var title = s.status + (s.duration ? " \\u00b7 " + s.duration : "") + (s.detail ? " \\u00b7 " + s.detail : "");
	return '<span class="stage ' + cls + '" title="' + esc(title) + '">' + esc(s.name) + "</span>";
}

function journalHtml(j) {
	var done = j.stages.filter(function (s) { return s.status === "done"; }).length;
	var active = j.stages.filter(function (s) { return s.status === "running"; })[0];
	return '<div class="journal' + (j.path === openJournal ? " open" : "") +
		'" data-p="' + esc(j.path) + '">' +
		'<div class="journal-head"><span class="pill ' + statusClass(j.status) + '">' + esc(j.status) + "</span>" +
		"<b>" + esc(j.title.replace(/^Run:\\s*/, "")) + "</b>" +
		'<span class="dim small">' + done + "/" + j.stages.length +
		(active ? " \\u00b7 " + esc(active.name) : "") + " \\u00b7 " + esc(fmtTime(j.date)) + "</span></div>" +
		'<div class="stages">' + j.stages.map(stageHtml).join("") + "</div>" +
		(j.pr ? '<div class="small"><a href="' + esc(j.pr) + '" target="_blank" rel="noopener">' + esc(j.pr) + "</a></div>" : "") +
		(j.path === openJournal ? '<pre class="code out" id="journal-body">loading\\u2026</pre>' : "") +
		"</div>";
}

async function loadRuns() {
	var list;
	try {
		list = await (await fetch("/api/journals")).json();
	} catch (e) {
		$("#runs").innerHTML = '<div class="empty small">could not read journals</div>';
		return;
	}
	if (!list.length) {
		$("#runs").innerHTML =
			'<div class="empty small">No harness journals found.<br/>' +
			"Set <code>ui.harnessDirs</code> in <code>~/.ah/config.json</code> to the " +
			"<code>docs/runs</code> directories you want followed.</div>";
		return;
	}
	var byHarness = {};
	list.forEach(function (j) { (byHarness[j.harness] = byHarness[j.harness] || []).push(j); });
	var html = "";
	Object.keys(byHarness).sort().forEach(function (h) {
		var live = byHarness[h].filter(function (j) { return j.status === "running"; }).length;
		html += '<section class="brain-sec"><h3>' + esc(h) +
			(live ? ' <span class="pill running">' + live + " live</span>" : "") + "</h3>" +
			byHarness[h].map(journalHtml).join("") + "</section>";
	});
	$("#runs").innerHTML = html;
	Array.prototype.forEach.call(document.querySelectorAll("#runs .journal"), function (el) {
		el.querySelector(".journal-head").addEventListener("click", function () {
			var p = el.getAttribute("data-p");
			openJournal = openJournal === p ? null : p;
			loadRuns();
		});
	});
	if (openJournal) {
		try {
			var text = await (await fetch("/api/journal?repo=" + encodeURIComponent(openJournal))).text();
			var body = $("#journal-body");
			if (body) body.textContent = text;
		} catch (e) { /* leave the loading note in place */ }
	}
}

$("#runs-btn").addEventListener("click", toggleRuns);
// Journals change while a watch autopilot is mid-run; keep the panel live.
setInterval(function () { if (runsOpen) loadRuns(); }, 5000);
`;
