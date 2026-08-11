/**
 * The run view: one ah session as a transcript, or one harness journal as a
 * stage pipeline plus its raw markdown. Which one is decided by the ref the
 * tab carries — a session key or a journal path.
 */
export const CLIENT_RUN_JS = `
var STAGE_CLASS = {
	done: "completed", ok: "completed", pass: "completed", passed: "completed",
	running: "running", failed: "error", error: "error",
	skipped: "stopped", skip: "stopped", pending: "",
};

function stageClass(status) {
	var key = String(status).toLowerCase();
	return Object.prototype.hasOwnProperty.call(STAGE_CLASS, key) ? STAGE_CLASS[key] : "";
}

/** Journals are files a harness wrote; only ever link out to http(s). */
function safeUrl(u) { return /^https?:\\/\\//.test(String(u)) ? String(u) : null; }

function stageHtml(s) {
	var cls = stageClass(s.status);
	var title = s.status + (s.duration ? " \\u00b7 " + s.duration : "") +
		(s.detail ? " \\u00b7 " + s.detail : "");
	// A failed stage is a handle onto the place in the journal that explains it.
	var jump = cls === "error" ? ' data-stage="' + esc(s.name) + '"' : "";
	return '<span class="stage ' + cls + '"' + jump + ' title="' + esc(title) + '">' +
		esc(s.name) + "</span>";
}

/**
 * The failing stage's detail, rendered where it can be read. It is the whole
 * evidence behind a "stage gate failed" attention item, and hiding it in a
 * title= tooltip stopped the symptom-to-evidence path one click short.
 */
function stageErrors(stages) {
	return (stages || []).filter(function (s) {
		var k = String(s.status).toLowerCase();
		return k === "failed" || k === "error";
	}).map(function (s) {
		return '<div class="error-line" data-stage="' + esc(s.name) + '">' +
			"<b>" + esc(s.name) + "</b> " + esc(s.status) +
			(s.duration ? " \\u00b7 " + esc(s.duration) : "") +
			(s.detail ? " \\u2014 " + esc(s.detail) : "") +
			' <span class="dim">(open in journal)</span></div>';
	}).join("");
}

/** Scroll the raw journal to the first line that names this stage. */
function jumpToStage(name) {
	var body = $("#journal-body");
	if (!body) return;
	var lines = String(body.textContent).split("\\n");
	var needle = String(name).toLowerCase();
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].toLowerCase().indexOf(needle) === -1) continue;
		body.scrollTop = Math.max(0, (i / lines.length) * body.scrollHeight - 24);
		return;
	}
	toast("\\u201c" + name + "\\u201d is not named in this journal");
}

async function loadRun(ref) {
	window.__ahRunStatus = null;
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
	$("#run").innerHTML =
		'<div class="head-row"><h2>' + esc(d.header.task) + "</h2>" +
		'<span class="dim">' + esc(d.path) + "</span></div>" +
		'<div id="meta">' + metaHtml(d) + "</div>" +
		'<div id="transcript">' + d.items.map(itemHtml).join("") + statsHtml(d.stats) + "</div>";
	wireRunActions(d);
}

function wireRunActions(d) {
	var acts = {
		"copy-path": function () { copyText(d.path, "Path copied"); },
		"copy-nvim": function () { copyText('nvim "' + d.path + '"', "Command copied"); },
		"reveal": function () {
			fetch("/api/reveal?k=" + encodeURIComponent(activeTab().ref), { method: "POST" })
				.then(function (r) { toast(r.ok ? "Revealed in Finder" : "Reveal failed"); });
		},
	};
	$$("#run [data-act]").forEach(function (b) {
		b.addEventListener("click", acts[b.getAttribute("data-act")]);
	});
}

async function loadJournalRun(path) {
	var meta = null;
	// One journal's frontmatter, not the whole index: this repeats every 5s
	// while the run is live, and the index is a rescan of every journal on disk.
	try { meta = await getJson("/api/journal-meta?repo=" + encodeURIComponent(path)); }
	catch (e) { meta = null; }
	if (meta) window.__ahRunStatus = meta.status;
	var head = meta
		? '<div class="head-row"><h2>' + esc(meta.title.replace(/^Run:\\s*/, "")) + "</h2>" +
			pill(meta.status) + '<span class="dim">' + esc(meta.harness) + " \\u00b7 " +
			esc(fmtTime(meta.date)) + "</span></div>" +
			'<div class="stages">' + meta.stages.map(stageHtml).join("") + "</div>" +
			stageErrors(meta.stages) +
			(safeUrl(meta.pr) ? '<div class="small"><a class="ev" href="' + esc(meta.pr) +
				'" target="_blank" rel="noopener">' + esc(meta.pr) + "</a></div>" : "")
		: '<div class="head-row"><h2>' + esc(base(path)) + "</h2></div>";
	$("#run").innerHTML = head +
		'<div class="head-row"><span class="dim">' + esc(path) + "</span>" +
		'<div class="meta-actions">' +
		'<button class="act" data-act="copy-path">Copy path</button>' +
		'<button class="act" data-act="copy-nvim">Copy nvim command</button></div></div>' +
		'<pre class="code out" id="journal-body">loading\\u2026</pre>';
	$$("#run [data-act]").forEach(function (b) {
		b.addEventListener("click", function () {
			var act = b.getAttribute("data-act");
			copyText(act === "copy-nvim" ? 'nvim "' + path + '"' : path,
				act === "copy-nvim" ? "Command copied" : "Path copied");
		});
	});
	$$("#run [data-stage]").forEach(function (el) {
		el.addEventListener("click", function () { jumpToStage(el.getAttribute("data-stage")); });
	});
	try {
		var text = await (await fetch("/api/journal?repo=" + encodeURIComponent(path))).text();
		var body = $("#journal-body");
		if (body) body.textContent = text;
	} catch (e) {
		var el = $("#journal-body");
		if (el) el.textContent = "could not read this journal";
	}
}
`;
