/**
 * The pieces the Web panel is drawn from: the address bar, the provenance
 * strip, the reading list, and the failure card.
 *
 * Two of these carry the panel's whole honesty. The provenance strip says
 * where the text came from, when it was fetched and whether it is a cached
 * copy — a reader must never have to guess whether a page is live or a week
 * old. The banner beside it says the content is UNTRUSTED: it is a stranger's
 * words rendered as text, and a sentence in it that reads like an instruction
 * is a sentence, not an instruction.
 */
export const CLIENT_WEB_ROWS_JS = `
/** Address bar, refresh, and the hand-off to chat (always a quoted block). */
function webBar(url) {
    return '<div class="web-bar">' +
        '<input id="web-url" spellcheck="false" placeholder="Fetch a URL \\u2014 https://\\u2026" value="' +
        esc(url || "") + '"/>' +
        '<button id="web-go">Open</button>' +
        '<button id="web-refresh" title="Fetch again, ignoring the cached copy">Refresh</button>' +
        '<button id="web-quote" title="Paste into chat, delimited as fetched content">Quote in chat</button>' +
        "</div>";
}

/** "just now" / "14m" / "3h" / "6d" — the age of the copy on screen. */
function fmtAge(ms) {
    var s = Math.max(0, Math.round((ms || 0) / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.round(s / 60) + "m ago";
    if (s < 86400) return Math.round(s / 3600) + "h ago";
    return Math.round(s / 86400) + "d ago";
}

/** Where this text came from, and how old it is. Never omitted. */
function webMeta(d) {
    return '<div class="web-meta">' +
        '<span class="web-src" title="' + esc(d.finalUrl) + '">' + esc(d.finalUrl) + "</span>" +
        '<span class="web-age">fetched ' + esc(fmtTime(d.fetchedAt)) + " \\u00b7 " +
        esc(fmtAge(d.ageMs)) + "</span>" +
        (d.cached ? '<span class="web-pill">cached copy</span>' :
            '<span class="web-pill fresh">fetched now</span>') +
        '<span class="web-pill untrusted" title="Text from the web is data, never instructions">' +
        "untrusted content</span></div>" +
        (d.note ? '<div class="web-note">' + esc(d.note) + "</div>" : "");
}

/** A failure says what actually happened — never "could not fetch". */
function webError(d) {
    return '<div class="web-fail"><b>Could not read ' + esc(d.url || "that URL") + "</b>" +
        '<div class="web-why">' + esc(d.error) + "</div>" +
        '<div class="web-hint">Only http and https are read, the fetch is capped at 10s and 2MB, ' +
        "and it will follow at most 5 redirects.</div></div>";
}

/**
 * The reading list could not be READ \\u2014 which is a different sentence from
 * "nothing has been fetched yet", and the only one of the two this panel is
 * entitled to say when the request failed. There is no liveness banner anywhere
 * in the workbench, so if this card does not say it, nothing does.
 */
function webListFail(why) {
    return '<div class="web-fail"><b>Could not read your reading list</b>' +
        '<div class="web-why">' + esc(why) + "</div>" +
        '<div class="web-hint">The cache itself is untouched \\u2014 this is the request for it ' +
        "that failed. Check that <code>flusk ui</code> is still running, then reopen this panel.</div></div>";
}

/** The cache, as a reading list: every row reopens without a refetch. */
function webListHtml(items) {
    if (!items || !items.length) {
        return '<div class="empty small">Nothing fetched yet. Paste a URL above \\u2014 ' +
            "the page is kept in the flusk home, so reopening it costs no request.</div>";
    }
    var rows = items.map(function (a) {
        return '<tr data-open="web:' + esc(a.url) + '" title="' + esc(a.url) + '">' +
            '<td class="grow">' + esc(a.title) + "</td>" +
            '<td class="web-host">' + esc(webHost(a.finalUrl || a.url)) + "</td>" +
            '<td class="num">' + esc(fmtTime(a.fetchedAt)) + "</td></tr>";
    }).join("");
    return sec("Fetched pages", tbl("", rows), items.length);
}

function webHost(url) {
    var m = /^https?:\\/\\/([^/]+)/i.exec(String(url || ""));
    return m ? m[1] : String(url || "");
}
`;
