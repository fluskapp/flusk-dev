/**
 * The Ask-AI wire: the request and the stream. The picker that chooses WHO
 * answers, and what each row discloses about where it came from, is
 * client-ask-who.ts.
 *
 * It reuses `sseFrames` from the chat panel rather than parsing SSE a second
 * time — one framing bug is enough — and the server reuses the one chat
 * engine behind it, so "which model" and "how it streams" stay in the places
 * that already own them.
 *
 * The first frame is the PROMPT: the literal text the model received. It is
 * rendered under the answer, not hidden behind a flag, because the only way to
 * trust an auto-attached context is to be able to read what it turned into.
 *
 * An unavailable answerer stays in the picker, disabled, carrying its reason
 * (src/chat/detect.ts's rule) — and asking it anyway still returns the prompt
 * frame plus the reason, so the panel never goes quiet.
 */
export const CLIENT_ASK_SEND_JS = `
function askAnswerHtml() {
	var body = A.html
		? '<div class="ask-answer md">' + A.html + "</div>"
		: '<div class="ask-answer pre" id="ask-stream">' + esc(A.answer) + "</div>";
	var sent = A.prompt
		? '<details class="ask-sent"><summary>Exact prompt sent (' + esc(A.prompt.length) +
			' characters)</summary><pre id="ask-sent-body">' + esc(A.prompt) + "</pre></details>"
		: "";
	if (!A.answer && !A.html && !A.fail && !A.prompt) {
		return '<section class="ask-out"><div class="ask-empty">' +
			"No answer yet. Pick an action above, or write a question." + "</div></section>";
	}
	return '<section class="ask-out">' +
		(A.fail ? '<div class="ask-fail">' + esc(A.fail) + "</div>" : "") + body + sent + "</section>";
}

/** Plain text while it arrives; the server's renderer takes over at the end. */
function askPaintStream() {
	var el = $("#ask-stream");
	if (el) el.textContent = A.answer; else renderAsk();
}

async function askStream(body) {
	var reader = body.getReader(), decoder = new TextDecoder(), buf = "", ended = false;
	while (!ended) {
		var step = await reader.read();
		if (step.done) break;
		buf += decoder.decode(step.value, { stream: true });
		buf = sseFrames(buf, function (chunk) {
			if (chunk.type === "prompt") { A.prompt = chunk.text; renderAsk(); }
			else if (chunk.type === "delta") { A.answer += chunk.text; askPaintStream(); }
			else if (chunk.type === "error") A.fail = chunk.message;
			else if (chunk.type === "done") ended = true;
		});
	}
	try { await reader.cancel(); } catch (e) { /* already closed */ }
}

/** Markdown at the end only; a failed render costs formatting, never the answer. */
async function askFinish() {
	if (A.answer) {
		try { A.html = await postRender(A.answer, "md"); } catch (e) { /* keep the text */ }
	}
	renderAsk();
}

async function sendAsk() {
	var question = (A.q || "").trim();
	if (!question || A.busy) return;
	if (!A.who) { toast(A.whoErr || "No answerer available"); return; }
	A.answer = ""; A.html = ""; A.prompt = ""; A.fail = ""; A.busy = true;
	var ac = new AbortController();
	A.abort = ac;
	renderAsk();
	var cwd = askCwd();
	try {
		var r = await fetch("/api/ask", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				answererId: A.who, question: question, blocks: askBlocks(),
				cwd: cwd || undefined,
			}),
			signal: ac.signal,
		});
		if (!r.ok || !r.body) A.fail = "ask failed: HTTP " + r.status;
		else await askStream(r.body);
	} catch (e) {
		if (!ac.signal.aborted) A.fail = String((e && e.message) || e);
	}
	if (A.abort === ac) { A.busy = false; A.abort = null; }
	await askFinish();
}

/** Stop keeps whatever arrived — a partial answer is still an answer. */
function stopAsk() {
	if (A.abort) A.abort.abort();
	A.abort = null;
	A.busy = false;
	renderAsk();
}
`;
