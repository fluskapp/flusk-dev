/**
 * The chat tool window: a quiet transcript, a one-row composer, the panel's
 * geometry. Turn shaping lives here; the wire is client-chat-stream.ts.
 *
 * An assistant turn prefers `m.html` — markup the SERVER produced from the
 * reply text (POST /api/render, which escapes) — and falls back to escaped
 * plain text, so a failed render costs formatting and never the reply.
 */
export const CLIENT_CHAT_JS = `
var CHAT_KEY = "ah-chat-backend";
var CHAT_W_KEY = "ah-chat-width";
var CHAT_MIN_W = 300;

function updateChatCwd() {
	var el = $("#chat-cwd");
	if (!el) return;
	el.textContent = S.project ? S.project.path : "no project selected";
	el.title = el.textContent;
}
function scrollChat() { var l = $("#chat-log"); if (l) l.scrollTop = l.scrollHeight; }
function chatClock() {
	return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

/**
 * One turn. No role labels: the user's words sit in a tinted block on the
 * right, the model's are body text at full width, a failure is one muted line.
 */
function turnHtml(m, streaming) {
	if (m.err) return '<div class="turn-err">' + esc(m.content) + "</div>";
	var when = "<time>" + esc(m.at || "") + "</time>";
	if (m.role === "user") return '<div class="turn user"><div class="said">' +
		esc(m.content) + "</div>" + when + "</div>";
	var body = m.html
		? '<div class="body md">' + m.html + "</div>"
		: '<div class="body pre' + (streaming ? " streaming" : "") + '"' +
			(streaming ? ' id="chat-stream"' : "") + ">" + esc(m.content) + "</div>";
	return '<div class="turn model">' + body + when + "</div>";
}

function renderChat() {
	var log = $("#chat-log");
	if (!log) return;
	var msgs = S.chat.msgs;
	if (!msgs.length) {
		log.innerHTML = '<div class="empty small">Ask about the selected project.</div>';
		return;
	}
	var last = msgs.length - 1;
	log.innerHTML = msgs.map(function (m, i) {
		return turnHtml(m, S.chat.busy && i === last && m.role === "assistant" && !m.err);
	}).join("");
	scrollChat();
}

/** Stop stands in for Send while a reply streams; the caret shows progress. */
function chatBusyUi(on) {
	$("#chat-send").hidden = on;
	$("#chat-stop").hidden = !on;
}

function appendDelta(text) {
	var msgs = S.chat.msgs;
	var last = msgs[msgs.length - 1];
	if (!last || last.role !== "assistant" || last.err) {
		msgs.push({ role: "assistant", content: "", at: chatClock() });
		renderChat();
		last = msgs[msgs.length - 1];
	}
	last.content += text;
	// Plain text with a caret while it arrives; finishTurn() swaps in markup.
	var el = $("#chat-stream");
	if (el) { el.textContent = last.content; scrollChat(); } else renderChat();
}

/**
 * Failures are RENDER-ONLY: they carry "err", and chatBody() drops flagged
 * turns from the request — "claude not found on PATH" replayed to the model as
 * its own last turn is not conversation, it is poison in the next prompt.
 */
function chatError(message) {
	var msgs = S.chat.msgs;
	var last = msgs[msgs.length - 1];
	if (last && last.role === "assistant" && last.content === "" && !last.err) msgs.pop();
	msgs.push({ role: "assistant", content: message, err: true, at: chatClock() });
	renderChat();
}

/** Server HTML or nothing: an empty or failed render leaves the text alone. */
function setTurnHtml(m, html) {
	if (m && typeof html === "string" && html !== "") m.html = html;
	return m;
}
/** Grows to about six lines, then scrolls. */
function autogrowChat(el) {
	if (!el) return;
	el.style.height = "auto";
	el.style.height = Math.min(el.scrollHeight, 132) + "px";
}
function setChatVisible(on) {
	document.body.classList.toggle("chat-off", !on);
	localStorage.setItem("ah-chat-open", on ? "1" : "0");
	var btn = $("#chat-btn"); if (btn) btn.classList.toggle("on", on);
}
function toggleChat() { setChatVisible(document.body.classList.contains("chat-off")); }
function focusChat() {
	setChatVisible(true);
	var input = $("#chat-input");
	if (input) { autogrowChat(input); input.focus(); }
}

/** Width is the reader's choice and survives reloads; 300px stays usable. */
function setChatWidth(px) {
	return twSize("--tw-right", CHAT_W_KEY, px, CHAT_MIN_W, 760);
}

/**
 * Geometry and composer layout, once. The shell ships the parts; this pulls
 * the picker and the cwd into the single row under the textarea, so the
 * composer is picker + cwd + Send and nothing else.
 */
(function chatShell() {
	var panel = typeof document === "undefined" ? null : document.getElementById("chat");
	if (!panel) return;
	twRestore("--tw-right", CHAT_W_KEY, CHAT_MIN_W, 760);
	var row = panel.querySelector(".chat-actions");
	var pick = $("#chat-backend");
	var cwd = $("#chat-cwd");
	if (row && pick) row.insertBefore(pick, row.firstChild);
	if (row && cwd) row.insertBefore(cwd, $("#chat-send") || null);
	var input = $("#chat-input");
	if (input) input.addEventListener("input", function () { autogrowChat(this); });
	twGrip(panel, "chat-grip", function (ev) { setChatWidth(window.innerWidth - ev.clientX); });
})();
`;
