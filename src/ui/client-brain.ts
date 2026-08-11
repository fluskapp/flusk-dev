/**
 * The Brain view: what ah knows about the selected project. Local knowledge
 * (derived from its own session files) is always shown, so the view is useful
 * on a machine with no abagraph; goals, lessons and the unattended ledger
 * appear on top when the graph is reachable.
 */
export const CLIENT_BRAIN_JS = `
function toggleBrain() { togglePanel("brain"); }

function tallyRows(list, emptyText) {
	if (!list.length) return line(emptyText);
	return tbl("", list.map(function (t) {
		return '<tr><td class="mono grow">' + esc(t.name) + '</td><td class="num">' +
			esc(t.count) + "\\u00d7</td></tr>";
	}).join(""));
}

function goalHtml(g) {
	var done = g.tasks.filter(function (t) { return t.status === "done"; }).length;
	var rows = g.tasks.map(function (t) {
		return "<tr><td>" + pill(t.status) + '</td><td class="grow">' +
			esc(t.description || t.id) + "</td>" +
			'<td class="mono">' + (t.dependsOn.length ? "after " + esc(t.dependsOn.join(", ")) : "") +
			"</td></tr>";
	}).join("");
	return '<div class="head-row">' + pill(g.status) + "<b>" + esc(g.title) + "</b>" +
		'<span class="dim">' + done + "/" + g.tasks.length + " tasks</span></div>" + tbl("", rows);
}

function lessonRow(f) {
	return '<tr><td class="mono">' + esc(f.subject) + "</td><td>" + esc(f.predicate) +
		'</td><td class="grow">' + esc(f.object) + '</td><td class="num">' + esc(f.confidence) +
		"</td></tr>";
}

function ledgerRow(i) {
	var resting = i.cooldownUntil && Date.parse(i.cooldownUntil) > Date.now();
	return '<tr><td class="mono grow">' + esc(i.key) + "</td><td>" + pill(i.outcome || "pending") +
		'</td><td class="num">' + esc(i.attemptedAt ? fmtTime(i.attemptedAt) : "") +
		(resting ? " \\u00b7 resting" : "") + "</td></tr>";
}

function localHtml(l) {
	var r = l.runs;
	var head = '<div class="stats-row">' +
		statTile(String(r.total), "runs", "recorded here", "runs:" + (S.project ? S.project.name : "")) +
		statTile(String(r.completed), "completed", "", null) +
		statTile(String(r.failed), "failed", "", "tab:attention") +
		statTile(fmtCost(r.costUsd), "spend", "", null) + "</div>";
	var fails = l.failures.length
		? tbl("", l.failures.map(function (f) {
			return "<tr><td>" + pill("error") + '</td><td class="grow">' + esc(f.detail) +
				'</td><td class="mono">' + esc(f.task) + "</td></tr>";
		}).join(""))
		: line("No tool failures recorded.");
	return head +
		sec("Files it edits", tallyRows(l.files, "No files edited yet.")) +
		sec("Commands it runs", tallyRows(l.commands, "No commands run yet.")) +
		sec("Recent tool failures", fails);
}

async function loadBrain() {
	if (!S.project) {
		$("#brain").innerHTML = '<div class="empty small">Select a project to see what ah knows.</div>';
		return;
	}
	var repo = S.project.path;
	var d;
	try { d = await getJson("/api/memory?repo=" + encodeURIComponent(repo)); }
	catch (e) {
		$("#brain").innerHTML = '<div class="empty small">memory request failed</div>';
		return;
	}
	var head = '<div class="head-row"><h2>' + esc(S.project.name) + "</h2>" +
		'<span class="dim">' + (d.connected
			? "abagraph " + esc(d.namespace)
			: "local only \\u2014 " + esc(d.note || "abagraph not connected")) + "</span></div>";
	var graph = d.connected
		? sec("Goals", d.goals.length ? d.goals.map(goalHtml).join("") : line("No goals yet."), d.goals.length || null) +
			sec("Lessons", d.lessons.length
				? tbl("<tr><th>subject</th><th>predicate</th><th>object</th><th class=\\"num\\">conf</th></tr>",
					d.lessons.map(lessonRow).join(""))
				: line("Nothing learned yet."), d.lessons.length || null) +
			sec("Unattended ledger", d.ledger.length
				? tbl("", d.ledger.map(ledgerRow).join(""))
				: line("ah watch has not run."), d.ledger.length || null)
		: "";
	$("#brain").innerHTML = head + graph + localHtml(d.local);
}
`;
