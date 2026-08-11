/**
 * The Flows tool window: the flow library as one arrow chain each, the recent
 * flow runs as the same stage chips every harness run already uses, and one
 * run's steps with their output and the SOURCES their prompt was composed from.
 *
 * It mounts itself — the pinned tab, the toolbar button and the loadView case
 * are all registered from here — so the shell (page.ts, client-tabs.ts) only
 * has to hold an empty container.
 */
export const CLIENT_FLOW_JS = `
var FLOW = { runId: null };

function flowLibRows(list) {
	return list.map(function (f) {
		return "<tr><td>" + esc(f.name) + "</td>" +
			'<td class="mono grow">' + esc(f.shape) + "</td>" +
			"<td>" + esc(f.description) + "</td></tr>";
	}).join("");
}

/** A flow step, drawn as the harness stage chip it is. */
function flowStage(s) {
	return stageHtml({
		name: s.nodeId, status: s.ok ? "done" : "failed",
		duration: "", detail: s.note || s.kind,
	});
}

function flowPipeline(steps) {
	return '<div class="stages">' + steps.map(flowStage).join("") + "</div>";
}

function flowRunRow(r) {
	return '<tr data-flow-run="' + esc(r.runId) + '" title="' + esc(r.runId) + '">' +
		"<td>" + pill(r.status) + "</td>" +
		'<td class="grow">' + esc(r.task) + "</td>" +
		'<td class="mono">' + esc(r.flow) + "</td>" +
		"<td>" + flowPipeline(r.steps) + "</td>" +
		'<td class="num">' + esc(fmtCost(r.costUsd)) + "</td>" +
		'<td class="num">' + esc(fmtTime(r.at)) + "</td></tr>";
}

function flowStepHtml(s) {
	var sources = (s.sources || []).map(function (src) {
		return '<span class="chip">' + esc(src) + "</span>";
	}).join("");
	var scope = s.widened
		? '<span class="dim"> \u2014 this project has no indexed history; all projects were searched</span>'
		: "";
	return '<div class="flow-step">' +
		'<div class="flow-step-head">' + pill(s.ok ? "done" : "failed") +
		"<b>" + esc(s.nodeId) + "</b>" +
		'<span class="dim">' + esc(s.kind) + " \\u00b7 " + esc(s.promptTokens) +
		" prompt tokens \\u00b7 " + esc(fmtCost(s.costUsd)) + "</span></div>" +
		'<div class="flow-sources"><span class="dim">prompt composed from</span>' + scope +
		'<div class="chips">' + (sources || '<span class="chip">nothing indexed yet</span>') +
		"</div></div>" +
		'<pre class="code out">' + esc(s.output || s.note || "") + "</pre></div>";
}

async function loadFlowRun(runId) {
	var d;
	try { d = await getJson("/api/flow-runs?run=" + encodeURIComponent(runId)); }
	catch (e) {
		$("#flows").innerHTML = '<div class="empty small">could not read that run</div>';
		return;
	}
	$("#flows").innerHTML =
		'<div class="head-row"><h2>' + esc(d.task) + "</h2>" + pill(d.status) +
		'<span class="dim">' + esc(d.flow) + " \\u00b7 " + esc(d.runId) + "</span>" +
		'<span class="ev" data-flow-back="1">back to flows</span></div>' +
		flowPipeline(d.steps) +
		sec("Steps", d.steps.map(flowStepHtml).join(""), d.steps.length);
}

async function loadFlowsView() {
	if (FLOW.runId) return loadFlowRun(FLOW.runId);
	var lib = { library: [], user: [], errors: [] };
	var runs = [];
	try { lib = await getJson("/api/flows"); } catch (e) { /* keep the empty shape */ }
	try { runs = await getJson("/api/flow-runs?limit=40"); } catch (e) { runs = []; }
	var head = "<tr><th>flow</th><th>shape</th><th>what it is for</th></tr>";
	var runHead = "<tr><th>status</th><th>task</th><th>flow</th><th>pipeline</th>" +
		'<th class="num">cost</th><th class="num">when</th></tr>';
	var runBody = runs.length
		? tbl(runHead, runs.map(flowRunRow).join(""))
		: '<div class="empty small">No flow runs yet.<br/>Run ' +
			"<code>ah flow run \\"task\\"</code> \\u2014 the prompts are composed for you.</div>";
	$("#flows").innerHTML =
		'<div class="head-row"><h2>Flows</h2>' +
		'<span class="dim">composed prompts \\u00b7 no prompt is written by hand</span></div>' +
		sec("Recent runs", runBody, runs.length) +
		sec("Built-in", tbl(head, flowLibRows(lib.library)), lib.library.length) +
		sec("User flows", lib.user.length
			? tbl(head, flowLibRows(lib.user))
			: '<div class="empty small">Drop a flow JSON in <code>.ah/flows/</code>.</div>',
			lib.user.length) +
		(lib.errors || []).map(function (e) { return line("skipped: " + e); }).join("");
}

document.addEventListener("click", function (e) {
	var target = e.target;
	if (!target || !target.closest) return;
	if (target.closest("[data-flow-back]")) { FLOW.runId = null; loadFlowsView(); return; }
	var row = target.closest("[data-flow-run]");
	if (!row || !row.closest("#flows")) return;
	FLOW.runId = row.getAttribute("data-flow-run");
	loadFlowRun(FLOW.runId);
});

/** Mount: a pinned tab, its toolbar button, and the view loader. */
(function mountFlows() {
	VIEW_OF.flows = "#flows";
	PANEL_BTN.flows = "#flows-btn";
	PINNED.push({ id: "flows", kind: "flows", label: "Flows" });
	if (!tabById("flows")) S.tabs.push({ id: "flows", kind: "flows", label: "Flows", pinned: true });
	var inner = loadView;
	loadView = function (t) {
		if (t.kind === "flows") loadFlowsView();
		else inner(t);
	};
	var btn = $("#flows-btn");
	if (btn) btn.addEventListener("click", function () { FLOW.runId = null; togglePanel("flows"); });
	renderTabs();
})();
`;
