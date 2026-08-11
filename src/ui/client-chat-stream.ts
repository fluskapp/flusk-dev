/**
 * Everything the chat panel says over the wire: the backend list, the SSE
 * stream from POST /api/chat, and POST /api/render at the end of a turn.
 *
 * Deltas land as plain text so the reader sees the reply being written; the
 * finished text goes to the server's one markdown renderer and comes back as
 * HTML. If that call fails the plain text stays — a lost render must never
 * cost the reply.
 */
export const CLIENT_CHAT_STREAM_JS = `
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
	var usable = list.filter(function (b) { return b.available; }).length;
	if ($("#chat-note")) $("#chat-note").textContent = usable ? "" : "no backend available";
}

/** Split an SSE buffer into complete frames; returns the unparsed remainder. */
function sseFrames(buf, onChunk) {
	var i;
	while ((i = buf.indexOf("\\n\\n")) !== -1) {
		var frame = buf.slice(0, i);
		buf = buf.slice(i + 2);
		var lines = frame.split("\\n");
		for (var n = 0; n < lines.length; n++) {
			if (lines[n].indexOf("data:") !== 0) continue;
			var chunk = null;
			try { chunk = JSON.parse(lines[n].slice(5)); } catch (e) { chunk = null; }
			if (chunk) onChunk(chunk);
		}
	}
	return buf;
}

async function readChatStream(body) {
	var reader = body.getReader();
	var decoder = new TextDecoder();
	var buf = "";
	var ended = false;
	while (!ended) {
		var step = await reader.read();
		if (step.done) break;
		buf += decoder.decode(step.value, { stream: true });
		buf = sseFrames(buf, function (chunk) {
			if (chunk.type === "delta") appendDelta(chunk.text);
			else if (chunk.type === "error") chatError(chunk.message);
			else if (chunk.type === "done") ended = true;
		});
	}
	try { await reader.cancel(); } catch (e) { /* already closed */ }
}

/** The request body. Flagged turns are UI, never conversation (chatError). */
function chatBody(backendId, msgs, cwd) {
	var body = {
		backendId: backendId,
		messages: msgs.filter(function (m) { return !m.err; }).map(function (m) {
			return { role: m.role, content: m.content };
		}),
	};
	if (cwd) body.cwd = cwd;
	return body;
}

/**
 * End of turn: let the server render the reply as markdown, then swap it in.
 * Any failure leaves m.html unset, so the turn keeps showing its plain text.
 */
async function finishTurn(m) {
	if (!m || m.role !== "assistant" || m.err || !m.content) return;
	try {
		var r = await fetch("/api/render", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ text: m.content }),
		});
		if (r.ok) setTurnHtml(m, (await r.json()).html);
	} catch (e) { /* keep the plain text */ }
	renderChat();
}

async function sendChat() {
	var input = $("#chat-input");
	var text = input.value.trim();
	var backendId = $("#chat-backend").value;
	if (!text || S.chat.busy) return;
	if (!backendId) { toast("No chat backend available"); return; }
	localStorage.setItem(CHAT_KEY, backendId);
	input.value = "";
	autogrowChat(input);
	S.chat.msgs.push({ role: "user", content: text, at: chatClock() });
	S.chat.busy = true;
	// Captured, so this call's teardown can tell whether it is still the one
	// in flight: after Stop, a second send can start while the first is still
	// unwinding, and the first one's tail used to null out the second's
	// controller — leaving Stop unable to abort the stream on screen.
	var ac = new AbortController();
	S.chat.abort = ac;
	renderChat();
	chatBusyUi(true);
	try {
		var r = await fetch("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(chatBody(backendId, S.chat.msgs, S.project && S.project.path)),
			signal: ac.signal,
		});
		if (!r.ok || !r.body) chatError("chat failed: HTTP " + r.status);
		else await readChatStream(r.body);
	} catch (e) {
		if (!ac.signal.aborted) chatError(String((e && e.message) || e));
	}
	if (S.chat.abort === ac) {
		S.chat.busy = false;
		S.chat.abort = null;
		chatBusyUi(false);
	}
	// Stop lands here too, with a partial reply: render what did arrive.
	await finishTurn(S.chat.msgs[S.chat.msgs.length - 1]);
}

/** Abort the fetch and keep whatever already arrived on screen. */
function stopChat() {
	if (S.chat.abort) S.chat.abort.abort();
	S.chat.abort = null;
	S.chat.busy = false;
	chatBusyUi(false);
	renderChat();
}
`;
