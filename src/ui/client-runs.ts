/**
 * The unified run feed: flusk sessions and harness journals in one dense table,
 * newest first, optionally narrowed to one project. Every row opens the run
 * it stands for.
 */
export const CLIENT_RUNS_JS = `
function runHead(showProject) {
	return "<tr><th>status</th><th>run</th>" + (showProject ? "<th>project</th>" : "") +
		"<th>progress</th><th class=\\"num\\">cost</th><th class=\\"num\\">when</th></tr>";
}

function runRow(r, showProject) {
	var progress = r.progress || (r.kind === "session" ? "session" : "journal");
	return '<tr data-open="ref:' + esc(r.ref) + '" title="' + esc(r.ref) + '">' +
		"<td>" + pill(r.status) + "</td>" +
		'<td class="grow">' + esc(r.title) + "</td>" +
		(showProject ? "<td>" + projectLink(r.project) + "</td>" : "") +
		'<td class="mono">' + esc(progress) + "</td>" +
		'<td class="num">' + (r.costUsd == null ? "" : esc(fmtCost(r.costUsd))) + "</td>" +
		'<td class="num">' + esc(fmtTime(r.at)) + "</td></tr>";
}

function runFilterBar() {
	if (S.runSort === "cost") {
		return '<div class="head-row"><h2>Runs by cost</h2>' +
			'<span class="ev" data-open="runs:">show newest first</span></div>';
	}
	if (S.runFilter === null) {
		return '<div class="head-row"><h2>All runs</h2>' +
			'<span class="dim">every project \\u00b7 newest first</span></div>';
	}
	return '<div class="head-row"><h2>' + esc(S.runFilter) + " runs</h2>" +
		'<span class="ev" data-open="runs:">show all projects</span></div>';
}

async function loadRuns() {
	var url = "/api/runs?limit=120" +
		(S.runFilter ? "&project=" + encodeURIComponent(S.runFilter) : "");
	var rows;
	try { rows = await getJson(url); }
	catch (e) {
		$("#runs").innerHTML = '<div class="empty small">could not read the run feed</div>';
		return;
	}
	if (S.runSort === "cost") {
		rows = rows.slice().sort(function (a, b) { return (b.costUsd || 0) - (a.costUsd || 0); });
	}
	if (!rows.length) {
		$("#runs").innerHTML = runFilterBar() +
			'<div class="empty small">No runs yet.<br/>Run <code>flusk run "task"</code>, or point ' +
			"<code>ui.harnessDirs</code> at a harness's <code>docs/runs</code>.</div>";
		return;
	}
	var live = rows.filter(function (r) { return r.status === "running"; });
	var rest = rows.filter(function (r) { return r.status !== "running"; });
	$("#runs").innerHTML = runFilterBar() +
		(live.length
			? sec("Live", tbl(runHead(true), live.map(function (r) { return runRow(r, true); }).join("")), live.length)
			: "") +
		sec("Runs", tbl(runHead(true), rest.map(function (r) { return runRow(r, true); }).join("")), rest.length);
}
`;
