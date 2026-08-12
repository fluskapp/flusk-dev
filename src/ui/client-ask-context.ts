/**
 * The visible-context half of the Ask-AI panel: taking the snapshot, and
 * showing EXACTLY what will be attached.
 *
 * Every block is printed in full, not summarised and not counted. A "3 blocks
 * attached" line is the same as hiding them — the reader cannot tell whether
 * the span is the right twenty lines, and the wrong span is the failure this
 * panel exists to make visible. Each block can be switched off, and what stays
 * on is literally what client-ask-send.ts posts.
 *
 * Absences are printed too. The server never returns a bare empty context: an
 * unbuilt graph, a file with no language service and an unindexed path each
 * arrive as a note, and this file renders them where the missing block would
 * have been.
 */
export const CLIENT_ASK_CONTEXT_JS = `
/** Blocks still switched on, in the order they are shown. */
function askBlocks() {
	var blocks = (A.ctx && A.ctx.blocks) || [];
	return blocks.filter(function (b) { return !A.off[b.id]; });
}

function askBytes(n) {
	return n < 1024 ? n + " B" : Math.round(n / 102.4) / 10 + " KB";
}

/**
 * The selected agent's own prompt, which the server prepends to the question.
 * It is not one of A.ctx.blocks — it is added at api-ask-stream.ts and cannot
 * be switched off — but it IS part of what the model receives, so the panel
 * counts it and prints it. Before this it was first visible in the \`prompt\`
 * frame, which arrives after the request has already been dispatched.
 */
function askPreamble() {
	var who = typeof askWho === "function" ? askWho() : null;
	return (who && who.preamble ? String(who.preamble) : "").trim();
}

/** The one line that says how big the prompt is about to be. */
function askCountText() {
	var on = askBlocks(), size = 0, head = askPreamble();
	for (var i = 0; i < on.length; i++) size += on[i].text.length;
	var n = on.length + (head ? 1 : 0);
	return n === 0
		? "nothing attached"
		: n + (n === 1 ? " block \\u00b7 " : " blocks \\u00b7 ") + askBytes(size + head.length);
}
function askPaintCount() {
	var el = $("#ask-count");
	if (el) el.textContent = askCountText();
}

function askBlockHtml(b) {
	var off = !!A.off[b.id];
	return '<div class="ask-blk' + (off ? " off" : "") + '" data-ask-blk="' + esc(b.id) + '">' +
		'<label class="ask-blk-h"><input type="checkbox" data-ask-block="' + esc(b.id) + '"' +
		(off ? "" : " checked") + "/><span>" + esc(b.label) + "</span></label>" +
		'<pre class="ask-blk-b">' + esc(b.text) + "</pre></div>";
}

/**
 * The agent's prompt as its own block: rendered, counted, and labelled with who
 * wrote it. It carries no checkbox because it genuinely cannot be switched off
 * — pretending otherwise would be a worse lie than not showing it.
 */
function askPreambleHtml() {
	var head = askPreamble();
	if (!head) return "";
	var who = askWho();
	var where = askScopeText(who);
	return '<div class="ask-blk ask-blk-fixed" data-ask-blk="preamble">' +
		'<div class="ask-blk-h"><span>agent prompt \\u2014 ' + esc(who.label) +
		(where ? " (" + esc(where) + ")" : "") +
		', prepended to your question and not switchable</span></div>' +
		'<pre class="ask-blk-b">' + esc(head) + "</pre></div>";
}

/**
 * The context card. Never a blank box: a snapshot with no blocks prints the
 * server's own sentences, which say what to do about it.
 */
function askCtxHtml() {
	var blocks = (A.ctx && A.ctx.blocks) || [];
	var where = A.ctx && A.ctx.file
		? '<span class="ask-where" title="' + esc(A.ctx.file) + '">' + esc(base(A.ctx.file)) +
			(A.ctx.symbol ? " \\u203a " + esc(A.ctx.symbol) : "") + "</span>"
		: "";
	var body = A.loading
		? '<div class="ask-empty">Reading what is on screen \\u2026</div>'
		: askPreambleHtml() + blocks.map(askBlockHtml).join("");
	var notes = (A.err ? [A.err] : []).concat(A.notes || []);
	if (!A.loading && blocks.length === 0 && !askPreamble() && notes.length === 0) {
		notes = ["Nothing was attached, so the question goes to the model on its own."];
	}
	return '<section class="ask-ctx"><div class="ask-ctx-head"><span>Context attached</span>' +
		where + '<span class="spacer"></span><span id="ask-count" class="dim small">' +
		esc(askCountText()) + "</span></div>" + body +
		notes.map(function (n) { return '<div class="ask-note">' + esc(n) + "</div>"; }).join("") +
		"</section>";
}

/**
 * Switching a block off costs a repaint of one line, never of the composer.
 *
 * The state is SET from the checkbox, never flipped: the browser has already
 * flipped the box by the time this runs, so a flip here re-derives the same
 * answer only as long as it runs exactly once, and "exactly once" is not a
 * property a delegated listener can promise on its own.
 */
function askToggleBlock(id, checked) {
	A.off[id] = !checked;
	var el = $('[data-ask-blk="' + id + '"]');
	if (el) el.classList.toggle("off", !!A.off[id]);
	askPaintCount();
}

/**
 * Re-read the screen. The exclusions are cleared with it: they were choices
 * about the OLD symbol, and silently carrying "no blast radius" onto the next
 * question is exactly the invisible edit this panel refuses to make.
 */
async function askCapture() {
	var on = askOnScreen();
	A.loading = true;
	A.err = "";
	A.off = {};
	renderAsk();
	try {
		A.ctx = await getJson("/api/ask/context?file=" + encodeURIComponent(on.file) +
			"&line=" + on.line + "&col=" + on.col);
		A.notes = A.ctx.notes || [];
	} catch (e) {
		A.ctx = null;
		A.notes = [];
		A.err = "context unavailable: " + String((e && e.message) || e);
	}
	A.loading = false;
	renderAsk();
	askLoadAnswerers();
}
`;
