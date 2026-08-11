/**
 * The code viewer's structure strip, and the entry point that opens a file in
 * the viewer at all.
 *
 * `openCodeInto` is the wiring the whole feature hung on. For a while the
 * viewer existed and nothing called it: the page shipped `renderCode`, no
 * `#code` element was ever created, and `loadFile` routed every tab through
 * the markdown surface — so no identifier was clickable, `codeLookup` never
 * fired, and the Documentation window could only ever render "No symbol at
 * the caret". It returns FALSE rather than throwing when a file cannot be
 * served this way (a journal, an unindexed path, one over the source cap), so
 * the file tab's existing chain still runs behind it.
 *
 * The strip states its own refusals. It is fetched when a file OPENS, before
 * any /api/doc call, so it cannot borrow that route's sentence — the server
 * sends `note` and this prints it.
 */
export const CLIENT_CODE_OUTLINE_JS = `
/** The structure view. An engine-less file answers [] AND says why. */
async function codeOutline(host, path) {
    var rows = host.querySelector(".co-rows"), d = null;
    try { d = await getJson("/api/doc/outline?file=" + encodeURIComponent(path)); }
    catch (e) { d = null; }
    var items = (d && d.items) || [];
    if (!items.length) {
        rows.innerHTML = '<div class="co-empty">' +
            esc((d && d.note) || "no structure for this file") + "</div>";
        return;
    }
    rows.innerHTML = items.map(function (it) {
        return '<div class="co-row" data-gl="' + esc(it.line) + '" title="' + esc(it.kind) +
            '" style="padding-left:' + (6 + (it.depth || 0) * 12) + 'px"><span class="glyph">' +
            esc(String(it.kind).slice(0, 4)) + "</span>" + esc(it.name) + "</div>";
    }).join("") + (d.truncated
        ? '<div class="co-empty">first ' + esc(items.length) + " shown</div>" : "");
}

function outlineClick(e) {
    var row = e.target.closest && e.target.closest(".co-row");
    if (row) codeGoto(+row.getAttribute("data-gl"));
}

/**
 * Open \`path\` in the viewer inside \`host\`, at \`line\` (1-based; 0 = the top).
 * False when this server will not serve the file that way, so the caller can
 * fall through to whatever it did before.
 */
async function openCodeInto(host, path, line) {
    if (!host) return false;
    var d;
    try { d = await getJson("/api/source?file=" + encodeURIComponent(path)); }
    catch (e) { return false; }
    if (!d || typeof d.text !== "string") return false;
    try { await renderCode(host, d, line); }
    catch (e) { return false; }
    return true;
}

/** Open \`path\` in the file tab's viewer — what a jump to a definition uses. */
async function openCode(path, line, host) {
    var pane = host || $("#file");
    if (!pane) return false;
    pane.innerHTML = '<div class="empty small">opening \\u2026</div>';
    if (await openCodeInto(pane, path, line)) return true;
    pane.innerHTML = '<div class="empty small">' + esc(path) + " cannot be read here</div>";
    return false;
}
`;
