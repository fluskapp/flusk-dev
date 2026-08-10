/**
 * The "Brain" panel: what ah knows about the selected repo. Local knowledge
 * (derived from its own session files) is always shown, so the panel is
 * useful on a machine with no abagraph; goals, lessons and the unattended
 * ledger appear on top when the graph is reachable.
 */
export const CLIENT_BRAIN_JS = `
function toggleBrain() { togglePanel("brain"); }

function section(title, body) {
	return '<section class="brain-sec"><h3>' + esc(title) + "</h3>" + body + "</section>";
}
function emptyRow(text) { return '<div class="dim small pad">' + esc(text) + "</div>"; }

function statusClass(s) {
	if (s === "done" || s === "completed") return "completed";
	if (s === "failed" || s === "error" || s === "blocked") return "error";
	if (s === "running" || s === "active") return "running";
	return "stopped";
}

function tallyHtml(t) {
	return '<div class="fact"><code>' + esc(t.name) + "</code>" +
		'<span class="dim small">' + t.count + "\\u00d7</span></div>";
}

function localHtml(l) {
	var r = l.runs;
	var head = '<div class="stats-row">' +
		'<div class="stat"><div class="stat-v">' + r.total + '</div><div class="stat-l">runs</div></div>' +
		'<div class="stat"><div class="stat-v">' + r.completed + '</div><div class="stat-l">completed</div></div>' +
		'<div class="stat"><div class="stat-v">' + r.failed + '</div><div class="stat-l">failed</div></div>' +
		'<div class="stat"><div class="stat-v">$' + (Math.round(r.costUsd * 10000) / 10000) +
		'</div><div class="stat-l">spend</div></div></div>';
	var files = l.files.map(tallyHtml).join("") || emptyRow("no files edited yet");
	var cmds = l.commands.map(tallyHtml).join("") || emptyRow("no commands run yet");
	var fails = l.failures.map(function (f) {
		return '<div class="fact"><span class="pill error">error</span><span>' + esc(f.detail) +
			'</span><span class="dim small">' + esc(f.task) + "</span></div>";
	}).join("") || emptyRow("no tool failures recorded");
	return head + section("Files it edits", files) + section("Commands it runs", cmds) +
		section("Recent tool failures", fails);
}

function goalHtml(g) {
	var tasks = g.tasks.map(function (t) {
		var deps = t.dependsOn.length ? ' <span class="dim">after ' + esc(t.dependsOn.join(", ")) + "</span>" : "";
		return '<div class="task"><span class="pill ' + statusClass(t.status) + '">' + esc(t.status) +
			"</span><span>" + esc(t.description || t.id) + "</span>" + deps + "</div>";
	}).join("");
	var done = g.tasks.filter(function (t) { return t.status === "done"; }).length;
	return '<div class="goal"><div class="goal-head"><span class="pill ' + statusClass(g.status) + '">' +
		esc(g.status) + '</span><b>' + esc(g.title) + "</b>" +
		'<span class="dim small">' + done + "/" + g.tasks.length + " tasks</span></div>" + tasks + "</div>";
}

function lessonHtml(f) {
	return '<div class="fact"><code>' + esc(f.subject) + "</code> " + esc(f.predicate) +
		" <b>" + esc(f.object) + "</b> " + '<span class="dim small">conf ' + f.confidence +
		(f.status && f.status !== "active" ? " \\u00b7 " + esc(f.status) : "") + "</span></div>";
}

function ledgerHtml(i) {
	var resting = i.cooldownUntil && Date.parse(i.cooldownUntil) > Date.now();
	return '<div class="fact"><code>' + esc(i.key) + "</code> " +
		'<span class="pill ' + statusClass(i.outcome || "") + '">' + esc(i.outcome || "pending") + "</span>" +
		'<span class="dim small">' + (i.attemptedAt ? esc(fmtTime(i.attemptedAt)) : "") +
		(resting ? " \\u00b7 resting until " + esc(fmtTime(i.cooldownUntil)) : "") + "</span></div>";
}

async function loadBrain() {
	var repo = (lastList.find(function (s) { return s.key === current; }) || lastList[0] || {}).repoRoot;
	if (!repo) {
		$("#brain").innerHTML = '<div class="empty small">No sessions yet — nothing learned.</div>';
		return;
	}
	var d;
	try {
		d = await (await fetch("/api/memory?repo=" + encodeURIComponent(repo))).json();
	} catch (e) {
		$("#brain").innerHTML = '<div class="empty small">memory request failed</div>';
		return;
	}
	var head = '<div class="brain-head">' + esc(base(repo)) +
		(d.connected
			? ' \\u00b7 abagraph <code>' + esc(d.namespace) + "</code>"
			: ' \\u00b7 <span class="dim">local only — ' + esc(d.note || "abagraph not connected") + "</span>") +
		"</div>";
	var graph = d.connected
		? section("Goals", d.goals.length ? d.goals.map(goalHtml).join("") : emptyRow("no goals yet")) +
			section("Lessons", d.lessons.length ? d.lessons.map(lessonHtml).join("") : emptyRow("nothing learned yet")) +
			section("Unattended ledger", d.ledger.length ? d.ledger.map(ledgerHtml).join("") : emptyRow("ah watch has not run"))
		: "";
	$("#brain").innerHTML = head + graph + localHtml(d.local);
}

$("#brain-btn").addEventListener("click", toggleBrain);
`;
