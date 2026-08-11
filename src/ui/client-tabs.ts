/**
 * The editor tab strip. Three pinned tabs are the panels (Attention, Runs,
 * Docs); project, run, doc and file tabs open on top of them and close
 * again. Each carries a kind glyph — md / run / session / doc / find — one is
 * active with a 2px accent underline, and a breadcrumb under the strip says
 * where the active one lives: project › area › file.
 */
export const CLIENT_TABS_JS = `
var VIEW_OF = {
	attention: "#overview", runs: "#runs", docs: "#docs",
	project: "#project", run: "#run", doc: "#doc", file: "#file",
};
var PINNED = [
	{ id: "attention", kind: "attention", label: "Attention" },
	{ id: "runs", kind: "runs", label: "Runs" },
	{ id: "docs", kind: "docs", label: "Docs" },
];
var PANEL_BTN = {
	attention: "#overview-btn", runs: "#runs-btn", docs: "#docs-btn",
};
/** The glyph vocabulary; the Find tool window's header uses "find" too. */
var TAB_GLYPH = {
	attention: "att", runs: "run", docs: "doc",
	project: "prj", find: "find",
};
/** Which area of the workbench a tab belongs to — the middle breadcrumb. */
var TAB_AREA = {
	attention: "Attention", runs: "Runs", docs: "Docs",
	project: "Projects", run: "Runs", doc: "Docs", file: "Files",
};

function fileGlyph(path) { return isMd(path) ? "md" : ext(path) || "file"; }
function tabGlyph(t) {
	if (t.kind === "run") return refKind(t.ref) === "session" ? "session" : "run";
	if (t.kind === "doc") return "md";
	if (t.kind === "file") return fileGlyph(t.ref);
	return TAB_GLYPH[t.kind] || "tab";
}

function tabById(id) {
	return S.tabs.filter(function (t) { return t.id === id; })[0] || null;
}
function activeTab() { return tabById(S.active); }

function openTab(tab) {
	if (!tabById(tab.id)) S.tabs.push(tab);
	S.active = tab.id;
	renderTabs();
	renderActive(true);
	// Going somewhere is a history entry; coming back to it is not.
	if (typeof syncRoute === "function") syncRoute(true);
}
function closeTab(id) {
	var t = tabById(id);
	if (!t || t.pinned) return;
	var i = S.tabs.indexOf(t);
	S.tabs.splice(i, 1);
	if (S.active === id) S.active = (S.tabs[i - 1] || S.tabs[0] || PINNED[0]).id;
	renderTabs();
	renderActive(true);
	if (typeof syncRoute === "function") syncRoute(false);
}
function closeActiveTab() { closeTab(S.active); }

function renderTabs() {
	$("#tabs").innerHTML = S.tabs.map(function (t) {
		return '<div class="tab' + (t.id === S.active ? " on" : "") +
			'" data-open="tab:' + esc(t.id) + '" title="' + esc(t.title || t.label) + '">' +
			'<span class="glyph">' + esc(tabGlyph(t)) + "</span>" +
			'<span class="label">' + esc(t.label) + "</span>" +
			(t.pinned ? "" : '<span class="x" data-close="' + esc(t.id) +
				'" title="Close (w)">&#10005;</span>') +
			"</div>";
	}).join("");
	Object.keys(PANEL_BTN).forEach(function (k) {
		var t = activeTab();
		$(PANEL_BTN[k]).classList.toggle("on", !!t && t.kind === k);
	});
}

/**
 * project › area › file, with the leaf in full colour.
 *
 * The tab's OWN project wins over the one selected in the tree: an
 * all-projects search opens a hit from another repo, and prefixing it with
 * whatever the tree happened to be showing made the breadcrumb and the status
 * bar's path openly disagree.
 */
function renderCrumbs(t) {
	var parts = [];
	var owner = t.project || (S.project && S.project.name);
	if (owner) parts.push(owner);
	parts.push(TAB_AREA[t.kind] || t.kind);
	var leaf = t.ref ? base(t.ref) : "";
	if (leaf && leaf !== parts[parts.length - 1]) parts.push(leaf);
	$("#crumbs").innerHTML = parts.map(function (p, i) {
		return (i ? '<span class="sep">\\u203a</span>' : "") +
			'<span class="' + (i === parts.length - 1 ? "leaf" : "") + '">' + esc(p) + "</span>";
	}).join("");
}

/** Show the active tab's container and (re)load it. */
function renderActive(reload) {
	var t = activeTab() || PINNED[0];
	Object.keys(VIEW_OF).forEach(function (k) { $(VIEW_OF[k]).hidden = k !== t.kind; });
	renderCrumbs(t);
	// A panel is not a file; only a tab that stands for a path claims the
	// status bar's path field, and the views refine it once they have loaded.
	setStatusPath(t.ref && t.kind !== "project" ? t.ref : "");
	if (reload !== false) loadView(t);
}

function loadView(t) {
	if (t.kind === "attention") loadAttention();
	else if (t.kind === "runs") loadRuns();
	else if (t.kind === "docs") loadDocs();
	else if (t.kind === "project") loadProject(t.ref);
	else if (t.kind === "run") loadRun(t.ref);
	else if (t.kind === "doc") loadDoc(t.ref);
	else if (t.kind === "file") loadFile(t);
}

function togglePanel(kind) {
	var pinned = PINNED.filter(function (p) { return p.kind === kind; })[0];
	if (pinned) openTab(tabById(pinned.id) || pinned);
}

/** Open whatever a piece of evidence points at: session, journal, or doc. */
function openRef(ref, label, project) {
	var kind = refKind(ref) === "doc" ? "doc" : "run";
	var t = { id: kind + ":" + ref, kind: kind, label: label || base(ref), title: ref, ref: ref };
	if (project) t.project = project;
	openTab(t);
}
function openProject(name) {
	selectProject(name);
	openTab({ id: "project:" + name, kind: "project", label: name, title: name, ref: name });
}
function initTabs() {
	S.tabs = PINNED.map(function (p) { return { id: p.id, kind: p.kind, label: p.label, pinned: true }; });
	S.active = "attention";
	renderTabs();
	renderActive(false);
}
`;
