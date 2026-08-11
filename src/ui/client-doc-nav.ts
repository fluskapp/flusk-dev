/**
 * Where the Documentation tool window sends you: the gestures behind its rows
 * and its four keys.
 *
 * Nothing here opens anything itself. A definition and a usage go through
 * openFile (which owns tabs, breadcrumbs and the marked line); usages go to
 * the Find in Files tool window rather than to a second search this panel
 * would have to bound and explain; a run or a doc goes through openRef, the
 * same delegated verb the rest of the workbench uses; and a commit — the one
 * kind of evidence with no tab of its own — opens the palette's history card,
 * which already renders a commit's subject, body and paths.
 *
 * Split from client-doc.ts, which owns the window itself, to keep both inside
 * the file-size standard.
 */
export const CLIENT_DOC_NAV_JS = `
/** Navigation is the workbench's: openFile owns tabs, breadcrumbs and lines. */
function docGo(path, line) { openFile(path, line || 0); }

/** \\u2318B \\u2014 go to the definition of the symbol the panel is showing. */
function docGoToDefinition() {
	var doc = D.payload && D.payload.doc;
	if (!doc || !doc.defined) { toast("No symbol selected \\u2014 click an identifier first"); return; }
	docGo(doc.defined.file, doc.defined.line);
}

/**
 * \\u2325F7 \\u2014 a literal search across the projects, handed to Find in Files.
 * Deliberately NOT called "find usages" on screen: the engine's own exact list
 * is already in the panel, and this is ripgrep over text.
 */
function docFindUsages() {
	var doc = D.payload && D.payload.doc;
	if (!doc) { toast("No symbol selected \\u2014 click an identifier first"); return; }
	$("#find-q").value = doc.name;
	focusFind();
	runFind();
}

/** \\u2318F12 \\u2014 the structure view of whatever the code viewer is showing. */
function focusOutline() {
	var strip = $(".code-outline");
	if (!strip) { toast("Open a file in the code viewer for its structure"); return; }
	strip.setAttribute("tabindex", "-1");
	strip.focus();
	var first = $(".co-rows .co-row");
	if (first) first.scrollIntoView({ block: "nearest" });
}

/**
 * The palette draws commit cards; a sha the index never saw is copied.
 *
 * BY REF, not by search. A sha is an opaque identifier and is not in the
 * card's own text, so BM25 returned zero hits for every commit row in RELATED
 * and each one silently degraded to a clipboard copy.
 */
function docCommit(ref) {
	var fail = function () { copyText(ref, "Commit sha copied"); };
	getJson("/api/history/card?ref=" + encodeURIComponent(ref)).then(function (hit) {
		if (!hit || !hit.card) { fail(); return; }
		palOpen(true);
		$("#pal-q").value = ref.slice(0, 12);
		palCard(hit);
	}, fail);
}

/** One delegated handler; \`data-doc\` is this panel's own verb, never data-open. */
function docClick(e) {
	var el = e.target.closest ? e.target.closest("[data-doc]") : null;
	if (!el) return;
	var spec = el.getAttribute("data-doc"), i = spec.indexOf(":");
	var verb = spec.slice(0, i), value = spec.slice(i + 1);
	if (verb === "loc") docGo(el.getAttribute("data-path"), +value);
	else if (verb === "commit") docCommit(value);
	// The row already rendered a human title; openRef would otherwise label the
	// tab with the basename of a timestamped journal file.
	else if (verb === "ref") openRef(value, el.getAttribute("data-title"));
	else if (verb === "usages") docFindUsages();
}
`;
