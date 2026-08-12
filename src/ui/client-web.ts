/**
 * The Web panel (9): outside documentation, read beside the code.
 *
 * It fetches a URL THE USER TYPED — never one a page, a model or a fetched
 * document suggested — and renders the readable part of it with the same
 * server-side markdown renderer every other document in the workbench goes
 * through. Three things it deliberately does not do: run the page's scripts
 * (nothing but text survives the extractor on the server), treat what it
 * fetched as anything other than data, and hand that text to the chat without
 * the delimited "fetched content" wrapper the server built for it.
 *
 * With no URL open the panel is the reading list: everything already cached
 * in the flusk home, reopened without a request. The sections live in
 * client-web-rows.ts.
 */
export const CLIENT_WEB_JS = `
/** The reply on screen and the guard that keeps a slow one from winning. */
var W = { reply: null, seq: 0, refresh: false };

/** A row in the reading list, or anything else pointing at a page. */
function openWeb(url) {
    S.webUrl = url || null;
    togglePanel("web");
}

/** Enter in the box, the buttons, and the quote hand-off. */
function wireWeb() {
    var box = $("#web-url");
    if (!box) return;
    box.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); webGo(false); }
    });
    $("#web-go").addEventListener("click", function () { webGo(false); });
    $("#web-refresh").addEventListener("click", function () { webGo(true); });
    $("#web-quote").addEventListener("click", webQuote);
}

function webGo(refresh) {
    var box = $("#web-url");
    var url = box ? box.value.trim() : "";
    if (!url) { toast("Type a URL first"); return; }
    W.refresh = !!refresh;
    S.webUrl = url;
    loadWeb();
}

/**
 * The ONLY route from a fetched page into the chat, and it never pastes the
 * text bare: the server built \`quote\` as a labelled, delimited block saying
 * the content is untrusted data with no authority. Sending the raw page
 * instead would be handing a stranger the composer.
 */
function webQuote() {
    var d = W.reply;
    if (!d || !d.quote) { toast("Nothing fetched to quote"); return; }
    var input = $("#chat-input");
    if (!input) { copyText(d.quote, "Quoted block copied"); return; }
    input.value = input.value ? input.value + "\\n\\n" + d.quote : d.quote;
    if (typeof focusChat === "function") focusChat();
    toast("Quoted as fetched content");
}

function webPage(d) {
    if (d.error) return webError(d);
    return webMeta(d) + '<div class="ed-body"><div class="md web-md">' + d.html + "</div></div>";
}

/** Reading list, page, or reason — and a spinner for none of them. */
async function loadWeb() {
    var host = $("#web");
    if (!host) return;
    var seq = ++W.seq;
    if (!S.webUrl) {
        W.reply = null;
        var items = null, listErr = "";
        // A failed request is NOT an empty cache. Rendering the reading list's
        // "Nothing fetched yet" for it tells a reader with fifty cached pages
        // that their cache does not exist \\u2014 a claim this panel never checked.
        try { items = await getJson("/api/web/list"); }
        catch (e) { items = null; listErr = failWhy(e); }
        if (seq !== W.seq) return;
        host.innerHTML = webBar("") + (items === null ? webListFail(listErr) : webListHtml(items));
        wireWeb();
        syncCursor();
        return;
    }
    host.innerHTML = webBar(S.webUrl) +
        '<div class="web-note">Fetching ' + esc(S.webUrl) + " \\u2026</div>";
    wireWeb();
    var url = "/api/web?url=" + encodeURIComponent(S.webUrl) + (W.refresh ? "&refresh=1" : "");
    var d;
    try { d = await getJson(url); }
    catch (e) { d = { url: S.webUrl, error: "the dashboard could not run the fetch: " + failWhy(e) }; }
    W.refresh = false;
    if (seq !== W.seq) return;
    W.reply = d;
    setStatusPath(d.finalUrl || d.url || "");
    host.innerHTML = webBar(d.finalUrl || S.webUrl) + webPage(d);
    wireWeb();
}
`;
