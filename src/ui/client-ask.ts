/**
 * The Ask-AI panel (8): ask any agent about what is on screen, with the
 * context already attached.
 *
 * The rule this panel is built around is that NOTHING IS HIDDEN. The blocks it
 * attaches are rendered before the question is sent, each one switchable off,
 * and the exact prompt comes back from the server as the first frame of the
 * stream and is shown at the bottom. A pre-filled prompt you cannot read is
 * worse than pasting by hand, because you cannot tell what it got wrong.
 *
 * It is an EDITOR TAB, not a rail: the context is a snapshot taken when the
 * panel is opened (or when "Use what is on screen" is pressed), so covering
 * the file with the panel cannot change what the question is about.
 *
 * Split three ways under the file cap: the context card and the capture live
 * in client-ask-context.ts, the picker and the stream in client-ask-send.ts.
 */
import { ASK_ACTIONS } from "./ask-prompt.js";

export const CLIENT_ASK_JS = `
/** The snapshot, the answer, and the request in flight. One object, like F/D. */
var A = {
	ctx: null, notes: [], off: {}, answerers: [], who: "", whoErr: "", q: "",
	answer: "", html: "", prompt: "", err: "", fail: "",
	busy: false, abort: null, loading: false, recapture: true,
};
var ASK_ACTIONS = ${JSON.stringify(ASK_ACTIONS)};
var ASK_WHO_KEY = "flusk-ask-answerer";

/** The file and caret the viewer is holding — the whole of "on screen". */
function askOnScreen() {
	var t = typeof activeTab === "function" ? activeTab() : null;
	var open = typeof C !== "undefined" && C ? C : null;
	var file = (open && open.file) || (t && t.kind === "file" ? t.ref : "") || "";
	var at = open && open.at ? open.at : null;
	return { file: file, line: at ? at.line : 0, col: at ? at.col : 0 };
}

/** The project the question is about, so a CLI answerer runs in the right tree. */
function askCwd() {
	var name = A.ctx && A.ctx.project;
	var list = S.projects || [];
	for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i].path;
	return S.project ? S.project.path : "";
}

/**
 * Tab activation must NOT re-capture: coming back to read an answer would
 * otherwise replace the context that answer was about. Only the toolbar
 * button, the key, and the explicit button set A.recapture.
 */
function loadAsk() {
	renderAsk();
	if (A.recapture || A.ctx === null) { A.recapture = false; askCapture(); }
	else askLoadAnswerers();
}

function askComposeHtml() {
	var acts = ASK_ACTIONS.map(function (a) {
		return '<button class="act" data-ask-act="' + esc(a.id) + '">' + esc(a.label) + "</button>";
	}).join("");
	return '<div class="ask-acts">' + acts + "</div>" +
		'<textarea id="ask-q" rows="3" spellcheck="false" placeholder="Ask about the context above (' +
		'\\u2318\\u21a9 sends)">' + esc(A.q) + "</textarea>" +
		'<div class="ask-row">' +
		'<button id="ask-send" class="act"' + (A.busy ? " hidden" : "") + ">Ask</button>" +
		'<button id="ask-stop" class="act"' + (A.busy ? "" : " hidden") + ">Stop</button>" +
		'<span id="ask-note" class="dim small"></span></div>';
}

function renderAsk() {
	var host = $("#ask");
	if (!host) return;
	host.innerHTML = '<div class="ask-wrap">' +
		'<div class="ask-head"><select id="ask-who" title="Who answers"></select>' +
		'<span id="ask-via" class="dim small"></span><span class="spacer"></span>' +
		'<button id="ask-refresh" class="act" title="Re-read the file and symbol on screen">' +
		"Use what is on screen</button></div>" +
		askCtxHtml() + askComposeHtml() + askAnswerHtml() + "</div>";
	askPaintWho();
	wireAsk();
}

/** Delegated where the rows are generated, direct where the controls are fixed. */
function wireAsk() {
	var host = $("#ask");
	$("#ask-refresh").addEventListener("click", function () { askCapture(); });
	$("#ask-who").addEventListener("change", function () {
		A.who = this.value;
		try { localStorage.setItem(ASK_WHO_KEY, A.who); } catch (e) { /* private mode */ }
		// A full repaint, because the agent's own prompt is part of the context
		// card: choosing a different answerer changes what will be sent.
		renderAsk();
	});
	$("#ask-send").addEventListener("click", sendAsk);
	$("#ask-stop").addEventListener("click", stopAsk);
	var q = $("#ask-q");
	q.addEventListener("input", function () { A.q = this.value; });
	// \\u2318\\u21a9 sends; a bare Enter is a newline, because a question here is
	// usually more than one line and losing it to a stray Enter is unforgivable.
	q.addEventListener("keydown", function (e) {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendAsk(); }
	});
	// ONCE. #ask is created by page.ts and only ever has its innerHTML rewritten,
	// so a listener added per render accumulates: N listeners flipped A.off N
	// times per click, and on an even N a block the user unticked was still
	// posted. The controls above are safe because innerHTML just recreated them.
	if (host.dataset.wired !== "1") {
		host.dataset.wired = "1";
		host.addEventListener("click", function (e) {
			var act = e.target.closest && e.target.closest("[data-ask-act]");
			if (act) { askAction(act.getAttribute("data-ask-act")); return; }
			var box = e.target.closest && e.target.closest("[data-ask-block]");
			if (box) askToggleBlock(box.getAttribute("data-ask-block"), box.checked);
		});
	}
}

/** An action is a PRE-FILLED question, never a hidden mode: it lands in the box. */
function askAction(id) {
	for (var i = 0; i < ASK_ACTIONS.length; i++) {
		if (ASK_ACTIONS[i].id !== id) continue;
		A.q = ASK_ACTIONS[i].question;
		var q = $("#ask-q");
		if (q) { q.value = A.q; q.focus(); }
		return;
	}
}
`;
