/**
 * The Documentation tool window (7) — the thing IntelliJ is loved for, docked
 * on the right and PINNED: it follows the caret instead of vanishing on the
 * next keystroke, so you can read a symbol and edit beside it.
 *
 * It shows what an IDE shows (signature, doc comment, tags, definition,
 * usages) and then the part only ah can: the commits, runs, sessions and docs
 * that already touched this symbol. Three things it deliberately does NOT do:
 * render markdown (that is POST /api/render — one renderer, one escaping
 * rule), search for usages (that is the Find in Files tool window), or invent
 * an explanation for an empty answer — the server sends the sentence and the
 * panel prints it, because a blank box is indistinguishable from a bug.
 *
 * The sections live in client-doc-rows.ts and the gestures in
 * client-doc-nav.ts; this file is the window: state, states, and wiring.
 */

/** Right rail (7). The header carries the engine that answered the lookup. */
export const DOC_HTML = `<aside id="docwin">
	<div class="tw-head">
		<span class="tw-num">6</span><span>Documentation</span>
		<span class="spacer"></span>
		<span id="doc-provider" class="dw-badge" title="Which engine answered">none</span>
		<button id="doc-hide" title="Hide Documentation (F1 / &#8984;7)">&#10005;</button>
	</div>
	<div id="doc-sym" class="dw-sym"></div>
	<div id="doc-body"></div>
</aside>`;

export const CLIENT_DOC_JS = `
/** The symbol on screen, the in-flight lookup, and the sequence guarding it. */
var D = { payload: null, busy: "", seq: 0 };
var DOC_OPEN_KEY = "ah-doc-open", DOC_W_KEY = "ah-doc-width";

/** The chat rail sits to the right of this one, so it is part of the offset. */
function twRight() {
	var chat = $("#chat");
	return document.body.classList.contains("chat-off") || !chat ? 0 : chat.offsetWidth;
}

function docVisible(on) {
	document.body.classList.toggle("doc-on", !!on);
	try { localStorage.setItem(DOC_OPEN_KEY, on ? "1" : "0"); } catch (e) { /* private mode */ }
	$("#doc-btn").classList.toggle("on", !!on);
}
function toggleDoc() { docVisible(!document.body.classList.contains("doc-on")); }

/**
 * 6 / ⌘6 / F1 — IntelliJ's Quick Documentation verb. It LOOKS UP the symbol
 * last clicked in the code viewer and shows the answer; only with nothing to
 * look up does it fall back to toggling the rail. A key that closed the panel
 * while you were reading a symbol was the opposite of what it is named for.
 */
function docQuick() {
	if (typeof codeLookupCaret === "function" && codeLookupCaret()) { docVisible(true); return; }
	toggleDoc();
}

/**
 * The hand-off client-code.ts makes on every identifier click. The window
 * updates IN PLACE — same window, new symbol — and opens itself if it was
 * closed, because a lookup you asked for and cannot see is a lost lookup.
 */
function showSymbolDoc(payload) {
	D.busy = "";
	D.payload = payload || null;
	docVisible(true);
	renderDoc();
}

/** A lookup is out: the first symbol in a project waits for the index. */
function docBusy(file) {
	D.busy = file || "";
	D.payload = null;
	renderDoc();
}

function docEmpty(text) { return '<div class="dw-empty">' + esc(text) + "</div>"; }

/** Never a blank box: every state below prints a sentence you can act on. */
function renderDoc() {
	var p = D.payload, doc = p && p.doc, body = $("#doc-body");
	$("#doc-provider").textContent = doc ? doc.provider : "none";
	$("#doc-provider").classList.toggle("on", !!doc);
	$("#doc-sym").innerHTML = doc
		? '<span class="dw-name">' + esc(doc.name) + '</span><span class="dw-kind">' +
			esc(doc.kind) + "</span>"
		: "";
	if (D.busy) {
		body.innerHTML = docEmpty("Indexing this project to look up " + base(D.busy) +
			" \\u2026 the first symbol waits for the language service, the rest are instant.");
	} else if (!p) {
		body.innerHTML = docEmpty("No symbol at the caret. Open a source file \\u2014 the project " +
			"tree, \\u2318\\u21e7O, or a Find in Files hit \\u2014 and click any identifier in it.");
	} else if (!doc) {
		body.innerHTML = docEmpty(p.note || "no symbol at this position");
	} else {
		body.innerHTML = docSections(p);
		docPaint(p, ++D.seq);
	}
}

/**
 * The two rendered blocks, from the server's renderer. \`seq\` is the guard: a
 * slow first render must never repaint over the symbol you clicked second.
 */
async function docPaint(p, seq) {
	var doc = p.doc;
	var file = p.file || (doc.defined && doc.defined.file) || "";
	var sig = await postRender(doc.signature, ext(file) || "ts").catch(function () { return ""; });
	var prose = doc.docs
		? await postRender(doc.docs, "md").catch(function () { return ""; })
		: "";
	if (seq !== D.seq) return;
	var sigEl = $("#doc-body .dw-sig"), proseEl = $("#doc-body .dw-doc");
	if (sigEl && sig) sigEl.innerHTML = sig;
	if (proseEl) proseEl.innerHTML = prose || '<div class="dw-none">no doc comment here</div>';
}

(function docInit() {
	$("#doc-hide").addEventListener("click", function () { docVisible(false); });
	$("#doc-btn").addEventListener("click", toggleDoc);
	// Draggable, like every other tool window: IntelliJ makes all of them so,
	// and four fixed rails ate 948px of chrome before any code was on screen.
	twGrip($("#docwin"), "doc-grip", function (ev) {
		twSize("--tw-doc", DOC_W_KEY, window.innerWidth - ev.clientX - twRight(), 220, 720);
	});
	$("#doc-body").addEventListener("click", docClick);
	// The viewer calls showSymbolDoc when this module is loaded and fires the
	// event when it is not; honouring both keeps either half worth shipping.
	document.addEventListener("ah-doc", function (e) { showSymbolDoc(e.detail); });
	// The PENDING half of a lookup belongs to whoever made the request, and
	// that is the viewer. Wrapping it (rather than duplicating the fetch) is
	// what lets the panel say "indexing" instead of showing the previous
	// symbol as though it were the one just clicked.
	if (typeof codeLookup === "function") {
		var inner = codeLookup;
		codeLookup = function (file, line, col) { docBusy(file); return inner(file, line, col); };
	}
	// Closed until asked for, like Find: a rail that eats 340px before you
	// have looked anything up is a rail you close and never reopen.
	twRestore("--tw-doc", DOC_W_KEY, 220, 720);
	docVisible(localStorage.getItem(DOC_OPEN_KEY) === "1");
	renderDoc();
})();
`;
