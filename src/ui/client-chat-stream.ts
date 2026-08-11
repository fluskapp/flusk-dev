/**
 * The chat transport: POST /api/chat and read its SSE frames, appending each
 * delta as it lands so the reply is visible while it is still being written.
 * Stop aborts the fetch, which the server turns into an aborted engine — a
 * closed stream must never leave a CLI running.
 */
export const CLIENT_CHAT_STREAM_JS = `
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

async function sendChat() {
	var input = $("#chat-input");
	var text = input.value.trim();
	var backendId = $("#chat-backend").value;
	if (!text || S.chat.busy) return;
	if (!backendId) { toast("No chat backend available"); return; }
	localStorage.setItem(CHAT_KEY, backendId);
	input.value = "";
	S.chat.msgs.push({ role: "user", content: text });
	S.chat.busy = true;
	// Captured, so this call's teardown can tell whether it is still the one
	// in flight: after Stop, a second send can start while the first is still
	// unwinding, and the first one's tail used to null out the second's
	// controller — leaving Stop unable to abort the stream on screen.
	var ac = new AbortController();
	S.chat.abort = ac;
	renderChat();
	chatBusyUi(true);
	// Error bubbles are UI, not conversation: sending them back would replay
	// "claude not found on PATH" to the model as its own last turn.
	var body = { backendId: backendId, messages: S.chat.msgs.filter(function (m) {
		return !m.err;
	}).map(function (m) {
		return { role: m.role, content: m.content };
	}) };
	if (S.project) body.cwd = S.project.path;
	try {
		var r = await fetch("/api/chat", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
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
	renderChat();
}

function stopChat() {
	if (S.chat.abort) S.chat.abort.abort();
	S.chat.abort = null;
	S.chat.busy = false;
	chatBusyUi(false);
	renderChat();
	toast("Stopped");
}
`;
