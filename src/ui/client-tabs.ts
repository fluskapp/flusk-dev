/**
 * The editor tab strip. Four pinned tabs are the panels (Attention, Runs,
 * Docs, Brain); project, run and doc tabs open on top of them and close
 * again. One tab is active, one view container is visible, and every open
 * lands here — nothing in this dashboard is a dead end.
 */
export const CLIENT_TABS_JS = `
var VIEW_OF = {
	attention: "#overview", runs: "#runs", docs: "#docs", brain: "#brain",
	project: "#project", run: "#run", doc: "#doc",
};
var PINNED = [
	{ id: "attention", kind: "attention", label: "Attention" },
	{ id: "runs", kind: "runs", label: "Runs" },
	{ id: "docs", kind: "docs", label: "Docs" },
	{ id: "brain", kind: "brain", label: "Brain" },
];
var PANEL_BTN = {
	attention: "#overview-btn", runs: "#runs-btn", docs: "#docs-btn", brain: "#brain-btn",
};

function tabById(id) {
	return S.tabs.filter(function (t) { return t.id === id; })[0] || null;
}
function activeTab() { return tabById(S.active); }

function openTab(tab) {
	if (!tabById(tab.id)) S.tabs.push(tab);
	S.active = tab.id;
	renderTabs();
	renderActive(true);
}
function closeTab(id) {
	var t = tabById(id);
	if (!t || t.pinned) return;
	var i = S.tabs.indexOf(t);
	S.tabs.splice(i, 1);
	if (S.active === id) S.active = (S.tabs[i - 1] || S.tabs[0] || PINNED[0]).id;
	renderTabs();
	renderActive(true);
}
function closeActiveTab() { closeTab(S.active); }

function renderTabs() {
	$("#tabs").innerHTML = S.tabs.map(function (t) {
		return '<div class="tab' + (t.id === S.active ? " on" : "") +
			'" data-open="tab:' + esc(t.id) + '" title="' + esc(t.title || t.label) + '">' +
			'<span class="label">' + esc(t.label) + "</span>" +
			(t.pinned ? "" : '<span class="x" data-close="' + esc(t.id) + '">&#10005;</span>') +
			"</div>";
	}).join("");
	Object.keys(PANEL_BTN).forEach(function (k) {
		var t = activeTab();
		$(PANEL_BTN[k]).classList.toggle("on", !!t && t.kind === k);
	});
}

/** Show the active tab's container and (re)load it. */
function renderActive(reload) {
	var t = activeTab() || PINNED[0];
	Object.keys(VIEW_OF).forEach(function (k) { $(VIEW_OF[k]).hidden = k !== t.kind; });
	$("#crumb").textContent = (S.project ? S.project.name + " \\u203a " : "") + t.label;
	if (reload !== false) loadView(t);
}

function loadView(t) {
	if (t.kind === "attention") loadAttention();
	else if (t.kind === "runs") loadRuns();
	else if (t.kind === "docs") loadDocs();
	else if (t.kind === "brain") loadBrain();
	else if (t.kind === "project") loadProject(t.ref);
	else if (t.kind === "run") loadRun(t.ref);
	else if (t.kind === "doc") loadDoc(t.ref);
}

function togglePanel(kind) {
	var pinned = PINNED.filter(function (p) { return p.kind === kind; })[0];
	if (pinned) openTab(tabById(pinned.id) || pinned);
}

/** Open whatever a piece of evidence points at: session, journal, or doc. */
function openRef(ref, label) {
	var kind = refKind(ref) === "doc" ? "doc" : "run";
	openTab({ id: kind + ":" + ref, kind: kind, label: label || base(ref), title: ref, ref: ref });
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
