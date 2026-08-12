/**
 * The markdown surface every .md tab is built from: a toolbar carrying the
 * IntelliJ segmented control [Preview | Split | Raw], and a body in whichever
 * of those three the tab was last left in (remembered in localStorage, per
 * tab, so a journal you read raw stays raw and a doc stays rendered).
 *
 * Preview is the DEFAULT — the whole point of the exercise: a .md file opens
 * as a document, never as YAML frontmatter followed by asterisks.
 */
export const CLIENT_MD_JS = `
var MD_MODES = ["preview", "split", "raw"];
var MD_LABEL = { preview: "Preview", split: "Split", raw: "Raw" };
var MD_KEY = "flusk-md-mode";

function mdModes() {
	try { return JSON.parse(localStorage.getItem(MD_KEY) || "{}") || {}; } catch (e) { return {}; }
}
function mdMode(id) {
	var m = mdModes()[id];
	return MD_MODES.indexOf(m) === -1 ? "preview" : m;
}
function setMdMode(id, mode) {
	var all = mdModes();
	all[id] = mode;
	try { localStorage.setItem(MD_KEY, JSON.stringify(all)); } catch (e) { /* private mode */ }
}

/**
 * One control, three segments — IntelliJ's SegmentedButton. Raw needs a
 * source; without one it is off. \`aria-pressed\` carries the selection to a
 * screen reader, which the \`.on\` class alone never did.
 */
function mdSeg(mode, hasRaw) {
	return '<div class="seg" role="group" aria-label="Preview mode">' + MD_MODES.map(function (m) {
		var off = m !== "preview" && !hasRaw;
		return '<button data-md="' + m + '" aria-pressed="' + (m === mode) + '"' +
			(m === mode ? ' class="on"' : "") +
			(off ? ' disabled title="the server serves this document already rendered"' : "") +
			">" + MD_LABEL[m] + "</button>";
	}).join("") + "</div>";
}

function mdBody(mode, html, text) {
	var raw = '<pre class="raw code">' + esc(text) + "</pre>";
	var pre = '<div class="md">' + html + "</div>";
	if (mode === "raw") return '<div class="ed-body">' + raw + "</div>";
	if (mode === "split") return '<div class="ed-body split">' + raw + pre + "</div>";
	return '<div class="ed-body">' + pre + "</div>";
}

/**
 * Render one markdown tab into \`host\`. \`o.head\` is HTML that belongs above
 * the body in every mode — the run view's stage pipeline and PR link.
 * \`o.html\` is server-rendered (see postRender): never built here.
 */
function mdSurface(host, o) {
	var hasRaw = typeof o.text === "string" && o.text !== "";
	var mode = hasRaw ? mdMode(o.id) : "preview";
	host.innerHTML =
		'<div class="ed-bar">' + (o.title ? "<b>" + esc(o.title) + "</b>" : "") +
		'<span class="path">' + esc(o.path || "") + "</span>" + mdSeg(mode, hasRaw) +
		'<div class="meta-actions">' + (o.actions || "") + "</div></div>" +
		(o.head || "") + mdBody(mode, o.html || "", o.text || "");
	$$("#" + host.id + " [data-md]").forEach(function (b) {
		b.addEventListener("click", function () {
			if (b.disabled) return;
			var m = b.getAttribute("data-md");
			setMdMode(o.id, m);
			mdSurface(host, o);
			// Re-rendering replaces the button that was clicked, so without this
			// the focus falls to the body: the control could be reached from the
			// keyboard exactly once, and never showed its focused selection.
			var again = $("#" + host.id + ' [data-md="' + m + '"]');
			if (again) again.focus({ preventScroll: true });
		});
	});
	if (o.wire) o.wire(host);
}

/** The localStorage key for a tab's mode, or "" when the tab is not markdown. */
function mdId(t) {
	if (!t) return "";
	if (t.kind === "doc") return "doc:" + t.ref;
	if (t.kind === "run" && refKind(t.ref) !== "session") return "run:" + t.ref;
	if (t.kind === "file" && isMd(t.ref)) return "file:" + t.ref;
	return "";
}

/** p / s / R from the keyboard. Returns false when this tab is not markdown. */
function setActiveMdMode(mode) {
	var id = mdId(activeTab());
	if (!id) return false;
	setMdMode(id, mode);
	renderActive(true);
	return true;
}

/**
 * One property value. A URL becomes something you can click rather than a
 * string you have to select and paste, and a pull request becomes a labelled
 * button, because "open PR #187" is the action and the href was never the
 * information.
 */
function fmValue(k, v) {
	var url = safeUrl(v);
	if (!url) return esc(v);
	if (k === "pr") {
		var num = /\\/pull\\/(\\d+)/.exec(url);
		return '<a class="act" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
			"Open PR" + (num ? " #" + num[1] : "") + "</a>";
	}
	return '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + "</a>";
}

/**
 * The frontmatter of an already-rendered document, as a property table.
 *
 * The packed stage keys are lifted out and drawn as one pipeline row: left as
 * ordinary properties they filled the table with "stages.gate" / "running|0.0s|"
 * pairs, which is the file format leaking through the UI.
 */
function fmTable(fm) {
	var keys = Object.keys(fm || {}).filter(function (k) { return k.indexOf("stages.") !== 0; });
	var stages = stagesOfFm(fm);
	if (!keys.length && !stages) return "";
	var rows = keys.map(function (k) {
		return '<tr><th class="fm-k">' + esc(k) + '</th><td class="fm-v">' +
			fmValue(k, fm[k]) + "</td></tr>";
	});
	if (stages) {
		rows.push('<tr><th class="fm-k">stages</th><td class="fm-v">' +
			stagePipeline(stages) + "</td></tr>");
	}
	return '<table class="fm"><tbody>' + rows.join("") + "</tbody></table>";
}
`;
