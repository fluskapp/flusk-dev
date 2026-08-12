/**
 * The run view: one flusk session as a transcript. Which view a run tab gets is
 * decided by the ref it carries — a session key lands here, a journal path
 * lands in client-journal.ts, which renders it as markdown.
 */
export const CLIENT_RUN_JS = `
async function loadRun(ref) {
	window.__ahRunStatus = null;
	setStatusPath(ref);
	if (refKind(ref) === "session") await loadSessionRun(ref);
	else await loadJournalRun(ref);
}

async function loadSessionRun(key) {
	var d;
	try { d = await getJson("/api/session?k=" + encodeURIComponent(key)); }
	catch (e) {
		$("#run").innerHTML = '<div class="empty small">could not read that session</div>';
		return;
	}
	window.__ahRunStatus = d.status;
	setStatusPath(d.path);
	$("#run").innerHTML =
		'<div class="head-row"><h2>' + esc(d.header.task) + "</h2>" +
		'<span class="dim">' + esc(d.path) + "</span></div>" +
		'<div id="meta">' + metaHtml(d) + "</div>" +
		'<div id="transcript">' + d.items.map(itemHtml).join("") + statsHtml(d.stats) + "</div>";
	wireRunActions(d);
}

/**
 * \`nvim +LINE "path"\` when the tab was opened at a line. The peek surface is
 * the documented escape hatch for files flusk cannot render whole, so dropping
 * the line — the one thing the search hit knew — threw away the point.
 */
function nvimCmd(path) {
	var t = activeTab();
	return 'nvim ' + (t && t.line ? "+" + t.line + " " : "") + '"' + path + '"';
}

function wireRunActions(d) {
	var acts = {
		"copy-path": function () { copyText(d.path, "Path copied"); },
		"copy-nvim": function () { copyText(nvimCmd(d.path), "Command copied"); },
		"reveal": function () {
			fetch("/api/reveal?k=" + encodeURIComponent(activeTab().ref), { method: "POST" })
				.then(function (r) { toast(r.ok ? "Revealed in Finder" : "Reveal failed"); });
		},
	};
	$$("#run [data-act]").forEach(function (b) {
		b.addEventListener("click", acts[b.getAttribute("data-act")]);
	});
}

/**
 * Copy path / copy nvim command / reveal, for any view holding a file path.
 *
 * Reveal is offered everywhere rather than only on run transcripts: a journal
 * or a document is a file on disk, and "where IS this" was previously a
 * question you answered by copying the path and pasting it into a terminal.
 */
function pathActions() {
	return '<button class="act" data-act="copy-path">Copy path</button>' +
		'<button class="act" data-act="copy-nvim">Copy nvim command</button>' +
		'<button class="act" data-act="reveal-path">Reveal in Finder</button>';
}

/** The server takes the PATH here (a run transcript sends its session key). */
function revealPath(path) {
	fetch("/api/reveal?repo=" + encodeURIComponent(path), { method: "POST" })
		.then(function (r) { return r.ok ? null : r.json().catch(function () { return {}; }); })
		.then(function (bad) {
			toast(bad === null ? "Revealed in Finder" : (bad.error || "Reveal failed"));
		});
}

function wirePathActions(root, path) {
	$$(root + " [data-act]").forEach(function (b) {
		b.addEventListener("click", function () {
			var act = b.getAttribute("data-act");
			if (act === "copy-path") copyText(path, "Path copied");
			else if (act === "copy-nvim") copyText(nvimCmd(path), "Command copied");
			else if (act === "reveal-path") revealPath(path);
		});
	});
}
`;
