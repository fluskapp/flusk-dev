/**
 * Wiring and lifecycle: one delegated click handler for every "open" in the
 * workbench, the toolbar bindings, and the polls. Only live things poll —
 * anything already on disk is loaded once, without a spinner.
 */
export const CLIENT_BOOT_JS = `
/** Every clickable thing in a view carries data-open="<verb>:<value>". */
function handleOpen(spec) {
	if (!spec) return;
	var i = spec.indexOf(":");
	var verb = i === -1 ? spec : spec.slice(0, i);
	var value = i === -1 ? "" : spec.slice(i + 1);
	if (verb === "project") openProject(value);
	else if (verb === "ref") openRef(value);
	else if (verb === "tab") { var t = tabById(value); if (t) openTab(t); }
	else if (verb === "runs") {
		S.runFilter = value || null;
		S.runSort = null;
		if (value) selectProject(value);
		togglePanel("runs");
	} else if (verb === "spend") {
		/** The spend figure's own evidence: every run, priciest first. */
		S.runFilter = null;
		S.runSort = "cost";
		togglePanel("runs");
	} else if (verb === "docs") {
		S.docProject = value || null;
		if (value) selectProject(value);
		togglePanel("docs");
	}
}

/**
 * Opening a panel from the toolbar or a number key means the WHOLE panel.
 * Without this, "Runs" kept whatever filter a drill-in had left behind, so
 * the button labelled Runs silently showed one project's runs.
 */
function openPanel(kind) {
	if (kind === "runs") { S.runFilter = null; S.runSort = null; }
	if (kind === "docs") { S.docProject = null; }
	togglePanel(kind);
}

document.addEventListener("click", function (e) {
	var target = e.target;
	if (!target || !target.closest) return;
	var close = target.closest("[data-close]");
	if (close) { e.stopPropagation(); closeTab(close.getAttribute("data-close")); return; }
	var twisty = target.closest("[data-expand]");
	if (twisty) { e.stopPropagation(); toggleExpand(twisty.getAttribute("data-expand")); return; }
	var el = target.closest("[data-open]");
	if (!el) return;
	if (el.closest("#tree")) S.zone = "tree";
	else if (el.closest("#views")) S.zone = "view";
	handleOpen(el.getAttribute("data-open"));
});

function wireToolbar() {
	$("#theme").addEventListener("click", toggleTheme);
	$("#help-btn").addEventListener("click", function () { $("#help").hidden = false; });
	$("#help").addEventListener("click", function () { this.hidden = true; });
	$("#overview-btn").addEventListener("click", function () { openPanel("attention"); });
	$("#side-btn").addEventListener("click", toggleSide);
	$("#find-btn").addEventListener("click", function () { toggleFind(); });
	$("#runs-btn").addEventListener("click", function () { openPanel("runs"); });
	$("#docs-btn").addEventListener("click", function () { openPanel("docs"); });
	$("#chat-btn").addEventListener("click", toggleChat);
	$("#search").addEventListener("input", function () {
		S.query = this.value.toLowerCase();
		S.cursor = 0;
		renderTree();
	});
}

function wireChat() {
	$("#chat-hide").addEventListener("click", function () { setChatVisible(false); });
	$("#chat-send").addEventListener("click", sendChat);
	$("#chat-stop").addEventListener("click", stopChat);
	$("#chat-backend").addEventListener("change", function () {
		localStorage.setItem(CHAT_KEY, this.value);
	});
	$("#chat-input").addEventListener("keydown", function (e) {
		if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
	});
}

/**
 * Attention and Runs follow the PROJECT payload, not liveness. Gating them on
 * "something is running" froze both at the exact moment the last run ended —
 * which is when new failures appear — while the sidebar count kept updating
 * from the same poll, so the badge and the list openly disagreed.
 */
function startPolls() {
	setInterval(function () {
		loadProjects(false).then(function (changed) {
			if (!changed) return;
			var t = activeTab();
			if (t && (t.kind === "attention" || t.kind === "runs")) loadView(t);
		});
	}, 4000);
	setInterval(function () {
		var t = activeTab();
		if (t && t.kind === "run" && window.__ahRunStatus === "running") loadView(t);
	}, 5000);
}

(function init() {
	var savedTheme = localStorage.getItem("flusk-theme");
	if (savedTheme) document.documentElement.setAttribute("data-theme", savedTheme);
	setChatVisible(localStorage.getItem("flusk-chat-open") !== "0");
	setSideVisible(localStorage.getItem("flusk-side-open") !== "0");
	// Find starts CLOSED: it is a tool window you summon (⌘⇧F), not a rail
	// that eats a third of the editor before you have searched for anything.
	findVisible(localStorage.getItem(FIND_OPEN_KEY) === "1");
	wireToolbar();
	wireChat();
	wireFind();
	wireGrips();
	initTabs();
	updateChatCwd();
	renderStatus();
	// The router runs AFTER the projects land: a "project:" route names one of
	// them, and applying it against an empty list would drop the user on the
	// default panel and rewrite the URL they arrived on.
	loadProjects(true).then(function () { renderActive(true); initRouter(); });
	loadBackends();
	startPolls();
})();
`;
