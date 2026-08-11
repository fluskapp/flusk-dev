/**
 * The command palette — one key away from everything that already happened.
 * ⌘K/Ctrl+K opens it; typing searches commits, sessions, journals, docs and
 * skills live — scoped to the selected project, ⌘P for every project, because
 * one repo's house rules are not another's; Enter opens the hit in the
 * workbench; ⌘Enter composes a prompt
 * from the same query, every block untickable, so a token budget is spent in
 * the open. Its keydown listener is in the CAPTURE phase so it runs before the
 * workbench's own (client-keys.ts) and can swallow the keys it acts on —
 * otherwise Escape here would also clear the project filter behind it.
 */
/** Overlay plus the help rows the palette contributes to the shortcut sheet. */
export const PALETTE_HTML = `<div id="palette" class="overlay" hidden>
	<div class="pal-card">
		<input id="pal-q" spellcheck="false" placeholder="Search history — commits, sessions, journals, docs, skills"/>
		<div id="pal-list"></div>
		<div class="pal-foot"><span id="pal-note" class="dim small"></span><span class="spacer"></span><button id="pal-compose" class="act" title="Compose a prompt (&#8984;&#9166;)">Compose prompt</button></div>
	</div>
</div>
<div id="palette-help" hidden><kbd>&#8984;K</kbd><span>Command palette &mdash; search all history</span><kbd>&#8984;J</kbd><span>Palette: next / previous hit (&#8984;K)</span><kbd>&#8984;&#9166;</kbd><span>Palette: compose a prompt from the query</span><kbd>&#8984;P</kbd><span>Palette: scope to the selected project / all projects</span></div>`;

export const CLIENT_PALETTE_JS = `
var P = { q: "", hits: [], cur: 0, timer: 0, prompt: null, off: {}, all: false, card: null };
var PAL_KINDS = ["commit", "session", "journal", "doc", "skill"], DOT = " \\u00b7 ";
function palNote(text) { $("#pal-note").textContent = text; }
function palType() { clearTimeout(P.timer); P.timer = setTimeout(palSearch, 120); }
function palOpen(on) {
	$("#palette").hidden = !on;
	if (on) { $("#pal-q").focus(); $("#pal-q").select(); } else $("#pal-q").blur();
}
/** Marks matched terms BEFORE escaping, so a term can never eat an entity. */
function palMark(text, terms) {
	var raw = String(text == null ? "" : text);
	(terms || []).forEach(function (t) {
		var word = String(t).replace(/[^a-z0-9_]/gi, "");
		if (word.length > 1) raw = raw.replace(new RegExp("(" + word + ")", "gi"), "\\u0001$1\\u0002");
	});
	return esc(raw).split("\\u0001").join("<mark>").split("\\u0002").join("</mark>");
}
function palRow(h, i, group) {
	return (group ? '<div class="pal-group">' + esc(h.card.kind) + "s</div>" : "") +
		'<div class="pal-row' + (i === P.cur ? " on" : "") + '" data-i="' + i + '">' +
		'<span class="pal-title">' + palMark(h.card.title, h.terms) + '</span><span class="pal-meta">' +
		esc(h.card.project) + DOT + esc(h.card.at.slice(0, 10)) + "</span></div>";
}
function palRender() {
	var last = "";
	var rows = P.hits.map(function (h, i) {
		var row = palRow(h, i, h.card.kind !== last);
		last = h.card.kind;
		return row;
	}).join("");
	$("#pal-list").innerHTML = rows || '<div class="pal-empty">' +
		(P.q ? "No matches for " + esc(P.q) : "Type to search everything that already happened") + "</div>";
}
/** The project filter the workbench is showing, when it is showing one. */
function palScope() { return P.all || !S.project ? "" : "&project=" + encodeURIComponent(S.project.name); }
function palScopeNote() { return P.all || !S.project ? "all projects" : S.project.name + " only"; }
/**
 * Live search, grouped by kind. Grouping is presentation: the CURSOR goes to
 * the globally best-scoring hit, so Enter opens the ranker's answer rather
 * than the best commit that happens to sort into the first group.
 */
function palSearch() {
	var q = $("#pal-q").value.trim();
	P.q = q;
	if (!q) { P.hits = []; P.cur = 0; palRender(); palNote(""); return; }
	getJson("/api/history/search?limit=30" + palScope() + "&q=" + encodeURIComponent(q)).then(function (hits) {
		if (P.q !== q || P.prompt) return;
		var best = hits[0];
		P.hits = hits.slice().sort(function (a, b) {
			return PAL_KINDS.indexOf(a.card.kind) - PAL_KINDS.indexOf(b.card.kind) || b.score - a.score;
		});
		P.cur = Math.max(0, P.hits.indexOf(best));
		palRender();
		palNote(hits.length + " hits" + DOT + palScopeNote() + DOT + "\u2318P scope" + DOT + "Enter opens");
	}).catch(function () { palNote("search failed"); });
}
function palMove(delta) {
	if (!P.hits.length) return;
	P.cur = Math.max(0, Math.min(P.hits.length - 1, P.cur + delta));
	palRender();
	var on = $("#pal-list .pal-row.on");
	if (on) on.scrollIntoView({ block: "nearest" });
}
/**
 * A commit has no workbench view, and 75% of the corpus is commits — silently
 * copying a sha left three quarters of every result list with no path from
 * symptom to evidence. So a commit SHOWS its card (subject, body, paths: the
 * evidence itself) and copies the sha on the way.
 */
function palEnter() {
	var h = P.hits[P.cur];
	if (!h) return;
	if (h.card.kind === "commit") { palCard(h); return; }
	palOpen(false);
	openRef(h.card.ref, h.card.title);
}
document.addEventListener("keydown", function (e) {
	var stop = function () { e.preventDefault(); e.stopImmediatePropagation(); };
	var mod = e.metaKey || e.ctrlKey;
	var key = e.key.toLowerCase();
	if ($("#palette").hidden) {
		if (mod && key === "k") { stop(); P.prompt = null; palOpen(true); palSearch(); }
		return;
	}
	if (e.key === "Escape") {
		stop();
		if (P.prompt || P.card) { P.prompt = null; P.card = null; palSearch(); } else palOpen(false);
	} else if (e.key === "Enter") {
		stop();
		if (P.card) { palOpen(false); copyText(P.card.card.ref, "Commit sha copied"); P.card = null; }
		else if (P.prompt) copyText(palText().text, "Prompt copied");
		else if (mod) palCompose();
		else palEnter();
	} else if (mod && key === "p") {
		stop();
		P.all = !P.all;
		palSearch();
	} else if (!P.prompt && !P.card && (e.key === "ArrowDown" || e.key === "ArrowUp" || (mod && (key === "j" || key === "k")))) {
		stop();
		palMove(e.key === "ArrowDown" || key === "j" ? 1 : -1);
	}
}, true);
(function palInit() {
	$("#pal-q").addEventListener("input", palType);
	$("#pal-compose").addEventListener("click", palCompose);
	$("#palette").addEventListener("click", function (e) { if (e.target === this) palOpen(false); });
	$("#pal-list").addEventListener("click", function (e) {
		var row = e.target.closest ? e.target.closest(".pal-row") : null;
		if (row) { P.cur = Number(row.getAttribute("data-i")); palEnter(); }
	});
	$("#pal-list").addEventListener("change", function (e) {
		var i = e.target.getAttribute && e.target.getAttribute("data-b");
		if (i) { P.off[i] = !e.target.checked; palPrompt(); }
	});
	var help = $("#palette-help"), keys = $("#help .keys");
	while (help && keys && help.firstChild) keys.appendChild(help.firstChild);
})();
`;
