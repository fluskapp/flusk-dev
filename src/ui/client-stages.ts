/**
 * Harness stages, shown as a pipeline instead of as the text they are stored
 * in.
 *
 * A journal's frontmatter carries a nested map whose values are packed:
 *
 *   stages:
 *     gate: "running|0.0s|"
 *     merge: "pending|0.0s|"
 *
 * Flattened by the generic property table, that reached the screen literally —
 * "stages.gate" beside "running|0.0s|" — which is the storage encoding, not
 * information. The same run view that draws proper chips elsewhere left the
 * document view showing the pipe characters.
 *
 * So the encoding is decoded once, here, and both surfaces use it. Status
 * becomes a GLYPH as well as a colour: colour alone fails anyone who cannot
 * separate the greens from the reds, and it disappears entirely when the row
 * is selected and inverted.
 */
export const CLIENT_STAGES_JS = `
var STAGE_ICON = {
	done: "\\u2713", ok: "\\u2713", pass: "\\u2713", passed: "\\u2713", completed: "\\u2713",
	failed: "\\u2717", error: "\\u2717", blocked: "\\u2717",
	running: "\\u25cf", active: "\\u25cf",
	skipped: "\\u2298", skip: "\\u2298",
	pending: "\\u25cb", queued: "\\u25cb",
};

/** The packed value "status|duration|detail". Every field may be empty. */
function parseStage(value) {
	var parts = String(value == null ? "" : value).split("|");
	return {
		status: (parts[0] || "").trim(),
		duration: (parts[1] || "").trim(),
		detail: parts.slice(2).join("|").trim(),
	};
}

function stageIcon(status) {
	var k = String(status || "").toLowerCase();
	return Object.prototype.hasOwnProperty.call(STAGE_ICON, k) ? STAGE_ICON[k] : "\\u25cb";
}

/**
 * A duration of exactly 0.0s is what the harness writes for a stage that has
 * not started. Printing it implies work that took no time, so it is dropped —
 * the glyph already says "pending" and a zero adds only noise.
 */
function stageTime(s) {
	if (!s.duration || s.duration === "0.0s") return "";
	return ' <span class="stg-t">' + esc(s.duration) + "</span>";
}

/** One chip: glyph, name, and the duration when there is one worth showing. */
function stageChip(name, s) {
	var cls = stageClass(s.status);
	var title = name + " \\u00b7 " + (s.status || "unknown") +
		(s.duration ? " \\u00b7 " + s.duration : "") + (s.detail ? " \\u00b7 " + s.detail : "");
	return '<span class="stage ' + cls + '" title="' + esc(title) + '">' +
		'<span class="stg-i">' + stageIcon(s.status) + "</span>" +
		esc(name) + stageTime(s) + "</span>";
}

/**
 * Pulls the flattened "stages.<name>" keys out of a frontmatter object.
 * Returns null when there are none, so a document that is not a run journal
 * keeps its ordinary property table untouched.
 */
function stagesOfFm(fm) {
	var names = Object.keys(fm || {}).filter(function (k) { return k.indexOf("stages.") === 0; });
	if (!names.length) return null;
	return names.map(function (k) {
		return { name: k.slice(7), stage: parseStage(fm[k]) };
	});
}

function stagePipeline(rows) {
	return '<div class="stg-row">' + rows.map(function (r) {
		return stageChip(r.name, r.stage);
	}).join("") + "</div>";
}

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

/** " #188" when the URL names one, so the button says which PR it opens. */
function prNumber(u) {
	var m = /\\/pull\\/(\\d+)/.exec(String(u));
	return m ? " #" + m[1] : "";
}

function stageHtml(s) {
	var cls = stageClass(s.status);
	var title = s.status + (s.duration ? " \\u00b7 " + s.duration : "") +
		(s.detail ? " \\u00b7 " + s.detail : "");
	// A failed stage is a handle onto the place in the journal that explains it,
	// so it is a real control: focusable, and openable from the keyboard.
	var jump = cls === "error"
		? ' data-stage="' + esc(s.name) + '" tabindex="0" role="button"' : "";
	return '<span class="stage ' + cls + '"' + jump + ' title="' + esc(title) + '">' +
		'<span class="stg-i">' + stageIcon(s.status) + "</span>" +
		esc(s.name) + stageTime(s) + "</span>";
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
		return '<div class="error-line" data-stage="' + esc(s.name) +
			'" tabindex="0" role="button">' +
			"<b>" + esc(s.name) + "</b> " + esc(s.status) +
			(s.duration ? " \\u00b7 " + esc(s.duration) : "") +
			(s.detail ? " \\u2014 " + esc(s.detail) : "") +
			' <span class="dim">(open in journal)</span></div>';
	}).join("");
}

`;
