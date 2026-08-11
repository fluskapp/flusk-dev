/**
 * Find in Files: the query line of the bottom tool window, and the one
 * request it makes. Typing is debounced, and the "searching…" note is held
 * back 150ms so a fast ripgrep never flickers a spinner at you.
 *
 * Every answer states its own bounds — how many matches, in how many files,
 * where it looked, and whether a cap cut it short — because a short list
 * presented as the whole answer is a lie about what was searched.
 */
export const CLIENT_FIND_JS = `
function findNote(text, warn) {
	var el = $("#find-note");
	el.textContent = text || "";
	el.classList.toggle("warn", !!warn);
}

/** "" means every configured project — the scope select decides. */
function findScopeName() { return F.scope === "all" || !S.project ? "" : S.project.name; }

function findUrl(q) {
	var project = findScopeName();
	return "/api/find?q=" + encodeURIComponent(q) +
		(project ? "&project=" + encodeURIComponent(project) : "") +
		(F.mask ? "&glob=" + encodeURIComponent(F.mask) : "") +
		(F.cs ? "&case=1" : "") + (F.re ? "&regex=1" : "") + "&limit=200";
}

function findType() {
	clearTimeout(F.timer);
	F.timer = setTimeout(runFind, 200);
}

async function runFind() {
	var q = $("#find-q").value;
	F.q = q;
	clearTimeout(F.slow);
	// Abort the previous request, do not merely ignore it. Without this the
	// socket stayed open, the server never saw a close, and the abandoned rg
	// scanned every configured root to completion — so sustained typing piled
	// up 10-second searches nobody would ever read.
	if (F.ac) F.ac.abort();
	F.ac = typeof AbortController === "function" ? new AbortController() : null;
	if (q.trim() === "") {
		F.result = null;
		F.rows = [];
		F.cursor = -1;
		renderFindResults();
		findNote("");
		setActivity("");
		return;
	}
	// seq, not a boolean: a slow first search must not overwrite a fast second.
	var seq = ++F.seq;
	F.slow = setTimeout(function () {
		if (F.seq !== seq) return;
		findNote("searching\\u2026");
		setActivity("Searching " + (findScopeName() || "all projects"));
	}, 150);
	var result = null;
	var opts = F.ac ? { signal: F.ac.signal } : null;
	try { result = await getJson(findUrl(q), opts); } catch (e) { result = null; }
	if (F.seq !== seq) return;
	clearTimeout(F.slow);
	setActivity("");
	if (result === null) { findNote("search failed", true); return; }
	F.result = result;
	F.open = {};
	F.cursor = -1;
	renderFindResults();
	findNote(findSummary(result), result.truncated);
}

function findSummary(r) {
	var files = r.files.length;
	var text = r.total + " match" + (r.total === 1 ? "" : "es") + " in " + files +
		" file" + (files === 1 ? "" : "s") + " \\u00b7 " + (findScopeName() || "all projects") +
		" \\u00b7 " + r.tookMs + "ms";
	if (r.truncated) text += " \\u00b7 truncated";
	if (r.note) text += " \\u00b7 " + r.note;
	return text;
}

function findKey(e) {
	if (e.key === "ArrowDown") { e.preventDefault(); moveFind(1); }
	else if (e.key === "ArrowUp") { e.preventDefault(); moveFind(-1); }
	else if (e.key === "Enter") {
		e.preventDefault();
		if (F.cursor < 0) moveFind(1);
		else openFindRow(F.cursor);
	} else if (e.key === "Escape") {
		// Stop here: Escape in the find box means "close find", not "also clear
		// the project filter behind it".
		e.preventDefault();
		e.stopPropagation();
		findVisible(false);
	}
}

function wireFind() {
	$("#find-q").addEventListener("input", findType);
	$("#find-q").addEventListener("keydown", findKey);
	$("#find-mask").addEventListener("input", function () {
		F.mask = this.value.trim(); saveFindState(); findType();
	});
	$("#find-scope").addEventListener("change", function () {
		F.scope = this.value; saveFindState(); runFind();
	});
	$("#find-case").addEventListener("change", function () {
		F.cs = this.checked; saveFindState(); runFind();
	});
	$("#find-regex").addEventListener("change", function () {
		F.re = this.checked; saveFindState(); runFind();
	});
	$("#find-hide").addEventListener("click", function () { findVisible(false); });
	$("#find-results").addEventListener("click", findClick);
	restoreFindState();
}
`;
