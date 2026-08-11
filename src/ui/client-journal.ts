/**
 * A harness journal, rendered. The stage pipeline, its failing-stage evidence
 * and the PR link stay above the body; the body itself is the markdown the
 * harness wrote, RENDERED by default — frontmatter as a property table, not
 * as the YAML that used to be the first thing anyone saw.
 */
export const CLIENT_JOURNAL_JS = `
/**
 * Scroll the rendered journal to the first block that names this stage.
 *
 * Scoped to \`.md\`: the unscoped selector's \`pre\` matched the single
 * \`<pre class="raw code">\` that Raw and Split render, so the "jump" marked
 * and scrolled to the WHOLE document — and .hit-line is only styled under
 * .md, so nothing was visibly marked either. In Raw mode there are no blocks
 * to land on, so the raw pane is scrolled by the line's proportion instead.
 */
function jumpToStage(name) {
	var needle = String(name).toLowerCase();
	$$("#run .hit-line").forEach(function (el) { el.classList.remove("hit-line"); });
	var els = $$("#run .md h1, #run .md h2, #run .md h3, #run .md p," +
		" #run .md li, #run .md td, #run .md pre");
	for (var i = 0; i < els.length; i++) {
		if (String(els[i].textContent).toLowerCase().indexOf(needle) === -1) continue;
		els[i].classList.add("hit-line");
		els[i].scrollIntoView({ block: "center" });
		return;
	}
	if (jumpRawToStage(needle)) return;
	toast("\\u201c" + name + "\\u201d is not named in this journal");
}

/**
 * One stage is selected at a time. The class outlives :focus on purpose: the
 * click moves focus into the document, and IntelliJ keeps showing the row it
 * came from in the INACTIVE selection colour rather than dropping the mark.
 */
function pickStage(el) {
	$$("#run [data-stage]").forEach(function (o) { o.classList.remove("on"); });
	el.classList.add("on");
	jumpToStage(el.getAttribute("data-stage"));
}

/** Raw mode has one <pre>: scroll it to where the stage is named in the text. */
function jumpRawToStage(needle) {
	var raw = $("#run .ed-body pre.raw");
	if (!raw) return false;
	var text = String(raw.textContent);
	var at = text.toLowerCase().indexOf(needle);
	if (at === -1) return false;
	var before = text.slice(0, at).split("\\n").length - 1;
	var total = Math.max(1, text.split("\\n").length);
	raw.scrollTop = Math.max(0, (before / total) * raw.scrollHeight - raw.clientHeight / 2);
	return true;
}

function journalHead(meta, path) {
	if (!meta) return '<div class="head-row"><h2>' + esc(base(path)) + "</h2></div>";
	return '<div class="head-row"><h2>' + esc(meta.title.replace(/^Run:\\s*/, "")) + "</h2>" +
		pill(meta.status) + '<span class="dim">' + esc(meta.harness) + " \\u00b7 " +
		esc(fmtTime(meta.date)) + "</span></div>" +
		'<div class="stages">' + meta.stages.map(stageHtml).join("") + "</div>" +
		stageErrors(meta.stages) +
		// A button, not the URL. "Open PR #188" is the action; the href was only
		// ever something to copy out and paste into a browser by hand.
		(safeUrl(meta.pr) ? '<div class="meta-actions"><a class="act" href="' + esc(meta.pr) +
			'" target="_blank" rel="noopener noreferrer">Open PR' + prNumber(meta.pr) +
			"</a></div>" : "");
}

async function loadJournalRun(path) {
	var meta = null;
	// One journal's frontmatter, not the whole index: this repeats every 5s
	// while the run is live, and the index is a rescan of every journal on disk.
	try { meta = await getJson("/api/journal-meta?repo=" + encodeURIComponent(path)); }
	catch (e) { meta = null; }
	if (meta) window.__ahRunStatus = meta.status;
	var host = $("#run");
	var head = journalHead(meta, path);
	var text = "";
	try {
		var r = await fetch("/api/journal?repo=" + encodeURIComponent(path));
		if (r.ok) text = await r.text();
	} catch (e) { text = ""; }
	var html = "";
	if (text !== "") {
		try { html = await postRender(text, "md"); }
		catch (e) { html = '<div class="empty small">could not render this journal</div>'; }
	} else {
		html = '<div class="empty small">could not read this journal</div>';
	}
	mdSurface(host, {
		id: "run:" + path, path: path, head: head, html: html, text: text,
		actions: pathActions(),
		wire: function () {
			wirePathActions("#run", path);
			$$("#run [data-stage]").forEach(function (el) {
				el.addEventListener("click", function () { pickStage(el); });
				el.addEventListener("keydown", function (e) {
					if (e.key !== "Enter" && e.key !== " ") return;
					e.preventDefault();
					pickStage(el);
				});
			});
		},
	});
}
`;
