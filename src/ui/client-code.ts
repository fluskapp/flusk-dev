/**
 * The symbol-aware code viewer: source with a line gutter, a structure strip,
 * and an identifier under every click.
 *
 * The one idea here is that POSITION IS BAKED IN AT RENDER TIME. The server
 * already escapes and highlights the file (highlight.ts owns that invariant),
 * so this module makes a single pass over that HTML and wraps every
 * identifier run in a span carrying its 1-based line and col. A click is then
 * an attribute read — no client-side tokenizer, no second escaping rule, no
 * way for the viewer and the compiler to disagree about the caret. An `&…;`
 * entity counts as ONE column: it is one character of the file the service
 * is looking at.
 *
 * Two bounds, both of them load-bearing rather than tidy. The identifier
 * pattern is UNICODE (`gréet` is one span, not two, and a CJK name gets one
 * at all), and the pass STOPS wrapping past a budget: an 866KB minified file
 * became 12.8MB of DOM and 120,000 span nodes, which does not render slowly,
 * it hangs the tab. Past the budget the source is still shown, still
 * highlighted, still scrollable — it simply is not clickable, and says so.
 *
 * The lookup result is handed to the documentation window, which is its own
 * module: `showSymbolDoc(payload)` when it is loaded, and a DOM event
 * otherwise, so the viewer is still worth opening on its own.
 */
export const CLIENT_CODE_JS = `
/** The file on screen, the line jump-to-line marked, and the last symbol. */
var C = { file: "", line: 0, at: null };

/** Past these the DOM, not the parse, is what hangs the tab. */
var CODE_MAX_IDS = 20000, CODE_MAX_COL = 2000;

/**
 * Identifier spans over already-highlighted HTML, each carrying the 1-based
 * line/col it starts at. Tags are copied verbatim (they are the highlighter's,
 * and they hold no source text); an entity is one column.
 */
function codePositions(html) {
    var ID = /[\\p{L}_$][\\p{L}\\p{N}_$]*/uy;
    var out = "", i = 0, line = 1, col = 1, n = html.length, ids = 0, capped = false;
    while (i < n) {
        var ch = html.charAt(i);
        if (ch === "<") {
            var gt = html.indexOf(">", i);
            if (gt === -1) { out += html.slice(i); break; }
            out += html.slice(i, gt + 1); i = gt + 1; continue;
        }
        if (ch === "\\n") { out += ch; line++; col = 1; i++; continue; }
        if (ch === "&") {
            var sc = html.indexOf(";", i);
            if (sc !== -1 && sc - i < 8) { out += html.slice(i, sc + 1); i = sc + 1; col++; continue; }
        }
        ID.lastIndex = i;
        var m = ID.exec(html);
        if (m) {
            // Over budget the text still renders; only the click target is dropped.
            if (ids < CODE_MAX_IDS && col <= CODE_MAX_COL) {
                out += '<span class="idn" data-line="' + line + '" data-col="' + col + '">' +
                    m[0] + "</span>";
                ids++;
            } else { out += m[0]; capped = true; }
            i += m[0].length; col += m[0].length; continue;
        }
        out += ch; i++; col++;
    }
    C.capped = capped;
    return out;
}

/** One numbered row per line — a column, the way the editor draws it. */
function codeGutter(text) {
    var rows = "", lines = String(text).split("\\n").length;
    for (var i = 1; i <= lines; i++) rows += '<div class="gl" data-gl="' + i + '">' + i + "</div>";
    return rows;
}

/** Renders one /api/source payload; \`line\` 0 means "at the top". */
async function renderCode(host, d, line) {
    var html = await postRender(d.text, d.lang);
    C.file = d.path; C.at = null; C.capped = false;
    var body = codePositions(html);
    host.innerHTML =
        '<div class="ed-bar"><b>' + esc(base(d.path)) + '</b><span class="path">' +
        esc(d.path) + '</span><div class="meta-actions">' + pathActions() + "</div></div>" +
        (C.capped ? '<div class="code-note">This file is past the click-target budget (' +
            esc(CODE_MAX_IDS) + " identifiers, " + esc(CODE_MAX_COL) +
            " columns a line); the rest is shown read-only.</div>" : "") +
        '<div class="code-wrap"><aside class="code-outline"><div class="co-head">Structure</div>' +
        '<div class="co-rows"></div></aside>' +
        '<div class="code-view"><div class="code-gutter">' + codeGutter(d.text) + "</div>" +
        '<div class="code-body"><div class="code-mark" hidden></div>' + body + "</div></div></div>";
    host.querySelector(".code-body").addEventListener("click", codeClick);
    host.querySelector(".co-rows").addEventListener("click", outlineClick);
    if (host.id) wirePathActions("#" + host.id, d.path);
    codeOutline(host, d.path);
    codeGoto(line || 0);
}

/** A click is a POSITION, not a word: the span already knows where it is. */
function codeClick(e) {
    var el = e.target.closest && e.target.closest("[data-line][data-col]");
    if (!el) return;
    $$(".code-body .idn.on").forEach(function (s) { s.classList.remove("on"); });
    el.classList.add("on");
    C.at = { line: +el.getAttribute("data-line"), col: +el.getAttribute("data-col") };
    codeLookup(C.file, C.at.line, C.at.col);
}

/** F1 / \\u2318B on the last identifier clicked, so a key can start a lookup too. */
function codeLookupCaret() {
    if (!C.file || !C.at) return false;
    codeLookup(C.file, C.at.line, C.at.col);
    return true;
}

/** One request: the server folds the history half in beside the signature. */
async function codeLookup(file, line, col) {
    var url = "/api/doc?file=" + encodeURIComponent(file) + "&line=" + line + "&col=" + col;
    var d;
    try { d = await getJson(url); }
    catch (e) { d = { doc: null, related: null, note: "lookup failed" }; }
    d.file = file; d.line = line; d.col = col;
    showDoc(d);
}

/** The documentation window owns rendering; this only hands the answer over. */
function showDoc(payload) {
    if (typeof showSymbolDoc === "function") { showSymbolDoc(payload); return; }
    document.dispatchEvent(new CustomEvent("flusk-doc", { detail: payload }));
}

/** Open at a line: Find in Files and go-to-definition both land here. */
function codeGoto(line) {
    C.line = line || 0;
    $$(".code-gutter .gl.on").forEach(function (g) { g.classList.remove("on"); });
    var mark = $(".code-mark");
    if (mark) mark.hidden = true;
    if (!C.line) return;
    var gl = $('.code-gutter .gl[data-gl="' + C.line + '"]');
    if (!gl) return;
    gl.classList.add("on");
    // The band is placed from the gutter row's own offset rather than a copy
    // of the line height: one number in CSS, nothing to drift out of step.
    if (mark) { mark.style.top = gl.offsetTop + "px"; mark.hidden = false; }
    gl.scrollIntoView({ block: "center" });
}
`;
