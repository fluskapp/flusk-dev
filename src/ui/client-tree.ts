/**
 * The project tool window. A project is the unit of attention, so the tree is
 * projects — harnesses and repos — each expanding to Runs / Docs / Config.
 * ah's own sessions are counted into their project's Runs; there is no
 * session-only sidebar any more.
 */
export const CLIENT_TREE_JS = `
var lastTreeJson = "";

function projMatches(p) {
	if (!S.query) return true;
	return (p.name + " " + p.path + " " + p.kind).toLowerCase().indexOf(S.query) !== -1;
}

function childRow(label, count, action, name) {
	return '<div class="tree-row child" data-row="1" data-open="' + action + ":" + esc(name) + '">' +
		'<span class="twisty"></span><span class="node-name">' + esc(label) + "</span>" +
		(count == null ? "" : '<span class="count">' + esc(count) + "</span>") + "</div>";
}

function projectRow(p) {
	var open = !!S.expanded[p.name];
	var live = p.liveRuns > 0
		? '<span class="badge-live">' + p.liveRuns + " live</span>"
		: '<span class="count">' + p.runs + "</span>";
	var attn = p.attention.length
		? '<span class="badge-attn" title="needs attention">' + p.attention.length + "</span>"
		: "";
	var head = '<div class="tree-row' + (S.project && S.project.name === p.name ? " active" : "") +
		'" data-row="1" data-open="project:' + esc(p.name) + '" title="' + esc(p.path) + '">' +
		'<span class="twisty" data-expand="' + esc(p.name) + '">' + (open ? "\\u25be" : "\\u25b8") + "</span>" +
		'<span class="node-name">' + esc(p.name) + "</span>" +
		'<span class="kind-chip ' + esc(p.kind) + '">' + esc(p.kind) + "</span>" +
		(p.worktreeOf
			? '<span class="wt-chip" title="a git worktree of ' + esc(p.worktreeOf) +
				'">\u2937 ' + esc(p.worktreeOf) + "</span>"
			: "") +
		live + attn + "</div>";
	if (!open) return head;
	return head +
		childRow("Runs", p.runs, "runs", p.name) +
		childRow("Docs", p.docs, "docs", p.name) +
		childRow("Config", null, "project", p.name);
}

function renderTree() {
	var shown = orderProjects(S.projects.filter(projMatches));
	// Read off the ORDERED list, not from a count: a busy repo's worktrees sort
	// directly beneath it, so counting busy projects put the divider in the
	// middle of them. A worktree belongs with its parent whatever its own
	// activity, so it is never the row the divider lands on.
	var busyNames = {};
	shown.forEach(function (p) { if (isBusy(p)) busyNames[p.name] = 1; });
	var firstQuiet = -1;
	shown.forEach(function (p, i) {
		if (firstQuiet !== -1) return;
		if (isBusy(p)) return;
		if (p.worktreeOf && busyNames[p.worktreeOf]) return;
		firstQuiet = i;
	});
	$("#tree").innerHTML = shown.map(function (p, i) {
		return (i === firstQuiet && i > 0
			? '<div class="tree-sep">' + (shown.length - firstQuiet) + " quiet</div>"
			: "") + projectRow(p);
	}).join("") || (S.query
		? '<div class="empty small">No project matches \\u201c' + esc(S.query) + '\\u201d</div>'
		: '<div class="empty small">No projects indexed.<br/>Set <code>ui.projectDirs</code> in ' +
			"<code>~/.ah/config.json</code>.</div>");
	var live = S.projects.reduce(function (n, p) { return n + p.liveRuns; }, 0);
	var attn = S.projects.reduce(function (n, p) { return n + p.attention.length; }, 0);
	$("#count").textContent = shown.length + " project" + (shown.length === 1 ? "" : "s") +
		(attn ? " \\u00b7 " + attn + " need attention" : "") + (live ? " \\u00b7 " + live + " live" : "");
	renderStatus();
	syncCursor();
}

/** Tool window 1: the Projects rail folds away like any other. */
function toggleSide() {
	var off = document.body.classList.toggle("side-off");
	localStorage.setItem("ah-side-open", off ? "0" : "1");
	$("#side-btn").classList.toggle("on", !off);
}
function setSideVisible(on) {
	document.body.classList.toggle("side-off", !on);
	localStorage.setItem("ah-side-open", on ? "1" : "0");
	$("#side-btn").classList.toggle("on", on);
}

function toggleExpand(name) {
	S.expanded[name] = !S.expanded[name];
	renderTree();
}

function selectProject(name) {
	var p = S.projects.filter(function (x) { return x.name === name; })[0];
	if (!p) return;
	S.project = p;
	S.expanded[name] = true;
	renderTree();
	updateChatCwd();
}

/** Resolves true when the payload changed — the views poll on that, not on
 * whether anything happens to be running. */
async function loadProjects(force) {
	var text;
	try {
		var r = await fetch("/api/projects");
		text = await r.text();
	} catch (e) { return false; }
	if (!force && text === lastTreeJson) return false;
	lastTreeJson = text;
	try { S.projects = JSON.parse(text); } catch (e) { return false; }
	if (S.project) {
		var again = S.projects.filter(function (p) { return p.name === S.project.name; })[0];
		S.project = again || null;
	}
	if (!S.project && S.projects.length) {
		S.project = S.projects[0];
		S.expanded[S.project.name] = true;
		updateChatCwd();
	}
	renderTree();
	return true;
}
`;
