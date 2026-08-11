/**
 * The fallback file view: the lines Find matched, plus a straight answer about
 * why the rest is not here.
 *
 * Split from client-file.ts for the size standard. ah serves whole bodies only
 * for what it indexes, and inventing a body for anything else would be the one
 * thing a file viewer must never do.
 */
export const CLIENT_FILE_PEEK_JS = `
/** Everything else: the lines Find found, and an honest note about the rest. */
function filePeek(host, t) {
	var file = matchesFor(t.ref);
	host.innerHTML =
		'<div class="ed-bar"><b>' + esc(base(t.ref)) + "</b>" +
		'<span class="path">' + esc(t.ref) + "</span>" +
		'<div class="meta-actions">' + pathActions() + "</div></div>" +
		(file
			? '<div class="peek-wrap"><div class="peek">' + peekRows(file, t.line) + "</div></div>"
			: '<div class="empty small">ah serves whole file bodies for the documents and ' +
				"journals it indexes.<br/>Search this file (\\u2318\\u21e7F) to read its matching " +
				"lines here, or copy the nvim command above.</div>");
	wirePathActions("#file", t.ref);
	markLine();
}
`;
