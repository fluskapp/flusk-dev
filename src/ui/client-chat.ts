/**
 * The chat tool window: backend picker, transcript, composer. The picker
 * lists every backend the server offers — claude / codex / kimi and any
 * configured HTTP model — and shows an unavailable one with its reason
 * rather than hiding it. The choice is remembered in localStorage.
 */
export const CLIENT_CHAT_JS = `
var CHAT_KEY = "ah-chat-backend";

function updateChatCwd() {
	$("#chat-cwd").textContent = "cwd: " + (S.project ? S.project.path : "no project selected");
}

function scrollChat() {
	var log = $("#chat-log");
	log.scrollTop = log.scrollHeight;
}

function bubble(m, streaming) {
	return '<div class="bubble ' + (m.role === "user" ? "user" : "assistant") +
		(m.err ? " err" : "") + '"><div class="who">' +
		(m.role === "user" ? "you" : "model") + "</div>" +
		'<div class="text' + (streaming ? " streaming" : "") + '"' +
		(streaming ? ' id="chat-stream"' : "") + ">" + esc(m.content) + "</div></div>";
}

function renderChat() {
	var msgs = S.chat.msgs;
	if (!msgs.length) {
		$("#chat-log").innerHTML =
			'<div class="empty small">Ask the model about the selected project.</div>';
		return;
	}
	$("#chat-log").innerHTML = msgs.map(function (m, i) {
		return bubble(m, S.chat.busy && i === msgs.length - 1 && m.role === "assistant");
	}).join("");
	scrollChat();
}

function chatBusyUi(on) {
	$("#chat-send").disabled = on;
	$("#chat-stop").hidden = !on;
	$("#chat-note").textContent = on ? "streaming\\u2026" : "";
}

function appendDelta(text) {
	var msgs = S.chat.msgs;
	var last = msgs[msgs.length - 1];
	if (!last || last.role !== "assistant") {
		msgs.push({ role: "assistant", content: "" });
		renderChat();
		last = msgs[msgs.length - 1];
	}
	last.content += text;
	var el = $("#chat-stream");
	if (el) { el.textContent = last.content; scrollChat(); } else renderChat();
}

/**
 * Failure bubbles are RENDER-ONLY. They carry the flag "err", and
 * client-chat-stream.ts drops flagged turns when it builds the request — a
 * "claude not found on PATH" replayed to the model as an assistant turn is
 * not conversation, it is poison in the next prompt.
 */
function chatError(message) {
	var msgs = S.chat.msgs;
	var last = msgs[msgs.length - 1];
	if (last && last.role === "assistant" && last.content === "") msgs.pop();
	msgs.push({ role: "assistant", content: message, err: true });
	renderChat();
}

function backendOption(b, saved) {
	var label = b.label + (b.available ? "" : " \\u2014 " + (b.note || "unavailable"));
	return '<option value="' + esc(b.id) + '"' + (b.available ? "" : " disabled") +
		(b.available && b.id === saved ? " selected" : "") + ">" + esc(label) + "</option>";
}

async function loadBackends() {
	var list;
	try { list = await getJson("/api/chat/backends"); }
	catch (e) {
		$("#chat-backend").innerHTML = '<option value="">backends unavailable</option>';
		return;
	}
	var saved = localStorage.getItem(CHAT_KEY);
	var known = list.filter(function (b) { return b.available && b.id === saved; }).length > 0;
	if (!known) {
		var first = list.filter(function (b) { return b.available; })[0];
		saved = first ? first.id : "";
	}
	$("#chat-backend").innerHTML = list.length
		? list.map(function (b) { return backendOption(b, saved); }).join("")
		: '<option value="">no backends configured</option>';
	$("#chat-note").textContent = list.filter(function (b) { return b.available; }).length
		? "" : "no backend available";
}

function setChatVisible(on) {
	document.body.classList.toggle("chat-off", !on);
	localStorage.setItem("ah-chat-open", on ? "1" : "0");
	$("#chat-btn").classList.toggle("on", on);
}
function toggleChat() { setChatVisible(document.body.classList.contains("chat-off")); }
function focusChat() {
	setChatVisible(true);
	$("#chat-input").focus();
}
`;
