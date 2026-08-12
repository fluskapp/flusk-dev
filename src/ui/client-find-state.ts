/**
 * Find in Files: the panel's visibility and the four controls that decide
 * what a query means — scope, file mask, case, regex. Both are remembered,
 * because a workbench that restores your theme and your chat width and then
 * forgets you work in `*.ts` with Regex on is remembering the wrong things.
 */
export const CLIENT_FIND_STATE_JS = `
var FIND_OPEN_KEY = "flusk-find-open";
var FIND_STATE_KEY = "flusk-find-state";

/**
 * Scope, mask, case and regex, remembered. Everything else in the workbench
 * survives a reload — theme, chat width, panel visibility, per-tab markdown
 * mode — so having to re-tick Regex and re-type \`*.ts\` after every refresh
 * was the one place it forgot.
 */
function saveFindState() {
	try {
		localStorage.setItem(FIND_STATE_KEY,
			JSON.stringify({ scope: F.scope, mask: F.mask, cs: F.cs, re: F.re }));
	} catch (e) { /* private mode */ }
}
function restoreFindState() {
	var saved = null;
	try { saved = JSON.parse(localStorage.getItem(FIND_STATE_KEY) || "null"); } catch (e) { saved = null; }
	if (saved && typeof saved === "object") {
		if (saved.scope === "all" || saved.scope === "project") F.scope = saved.scope;
		F.mask = typeof saved.mask === "string" ? saved.mask : "";
		F.cs = !!saved.cs;
		F.re = !!saved.re;
	}
	$("#find-scope").value = F.scope;
	$("#find-mask").value = F.mask;
	$("#find-case").checked = F.cs;
	$("#find-regex").checked = F.re;
}

function findVisible(on) {
	document.body.classList.toggle("find-off", !on);
	localStorage.setItem(FIND_OPEN_KEY, on ? "1" : "0");
	$("#find-btn").classList.toggle("on", on);
}
// Opening always takes the caret, as IntelliJ does. Without this the panel
// appears but focus stays wherever it was, so the first thing typed lands in
// the chat composer instead of the query.
function toggleFind() {
	var opening = document.body.classList.contains("find-off");
	findVisible(opening);
	if (opening) { $("#find-q").focus(); $("#find-q").select(); }
}
function focusFind() {
	findVisible(true);
	$("#find-q").focus();
	$("#find-q").select();
}

`;
