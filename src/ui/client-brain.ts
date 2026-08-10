/**
 * The "Brain" panel: goals, lessons, and the unattended ledger — the
 * "what happened overnight" view. `brainOpen` is declared in client-list.ts
 * so the session poller can see it and leave this panel alone.
 */
export const CLIENT_BRAIN_JS = `

function toggleBrain() {
	brainOpen = !brainOpen;
	$("#brain").hidden = !brainOpen;
	$("#detail").hidden = brainOpen || !current;
	$("#empty").hidden = brainOpen || !!current;
	$("#brain-btn").classList.toggle("on", brainOpen);
	if (brainOpen) loadBrain();
}

async function loadBrain() {
	var repo = (lastList.find(function (s) { return s.key === current; }) || lastList[0] || {}).repoRoot;
	if (!repo) {
		$("#brain").innerHTML = '<div class="empty small">No sessions yet — nothing learned.</div>';
		return;
	}
	$("#brain").innerHTML = '<div class="empty small">loading\\u2026</div>';
	var d;
	try {
		d = await (await fetch("/api/memory?repo=" + encodeURIComponent(repo))).json();
	} catch (e) {
		$("#brain").innerHTML = '<div class="empty small">memory request failed</div>';
		return;
	}
	if (!d.connected) {
		$("#brain").innerHTML =
			'<div class="empty small"><b>Memory not connected</b><br/>' + esc(d.note || "") +
			"<br/><br/>Goals, lessons and the unattended ledger live in abagraph." +
			"<br/>Start it, or set <code>memory.baseUrl</code> in <code>~/.hit/config.json</code>.</div>";
		return;
	}
	$("#brain").innerHTML =
		'<div class="brain-head">namespace <code>' + esc(d.namespace) + "</code></div>" +
		section("Goals", d.goals.length ? d.goals.map(goalHtml).join("") : emptyRow("no goals yet")) +
		section("Lessons", d.lessons.length ? d.lessons.map(lessonHtml).join("") : emptyRow("nothing learned yet")) +
		section("Unattended ledger", d.ledger.length ? d.ledger.map(ledgerHtml).join("") : emptyRow("hit watch has not run"));
}

function section(title, body) {
	return '<section class="brain-sec"><h3>' + esc(title) + "</h3>" + body + "</section>";
}
function emptyRow(text) { return '<div class="dim small pad">' + esc(text) + "</div>"; }

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
		" <b>" + esc(f.object) + "</b> " +
		'<span class="dim small">conf ' + f.confidence +
		(f.status && f.status !== "active" ? " \\u00b7 " + esc(f.status) : "") + "</span></div>";
}

function ledgerHtml(i) {
	var resting = i.cooldownUntil && Date.parse(i.cooldownUntil) > Date.now();
	return '<div class="fact"><code>' + esc(i.key) + "</code> " +
		'<span class="pill ' + statusClass(i.outcome || "") + '">' + esc(i.outcome || "pending") + "</span>" +
		'<span class="dim small">' + (i.attemptedAt ? esc(fmtTime(i.attemptedAt)) : "") +
		(resting ? " \\u00b7 resting until " + esc(fmtTime(i.cooldownUntil)) : "") + "</span></div>";
}

function statusClass(s) {
	if (s === "done" || s === "completed") return "completed";
	if (s === "failed" || s === "error" || s === "blocked") return "error";
	if (s === "running" || s === "active") return "running";
	return "stopped";
}

$("#brain-btn").addEventListener("click", toggleBrain);
`;
