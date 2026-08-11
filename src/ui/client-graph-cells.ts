/**
 * The row vocabulary every section of the Graph tool window is written in:
 * clipping, the where-cell, the why-cell, the opening promise, and the audit
 * trail that goes on a row's title.
 *
 * It is its own module because both the tables (client-graph-rows.ts) and the
 * diagram (client-graph-draw.ts) render rows, and one definition of "is this
 * openable" is what keeps them from disagreeing about which rows are inert.
 *
 * TWO RULES LIVE HERE.
 *
 * IDS ARE OPAQUE (invariant 2). Nothing below splits a node id on ":" or "#"
 * to recover a name or a path: the derivation rules belong to the builders,
 * and a panel that reverse-engineers them is one rename away from displaying
 * confident nonsense. Labels and files come off the node; the project root
 * comes off the payload.
 *
 * A POINTER IS A PROMISE (styles-work.ts). A row that opens nothing must not
 * look like a row that does, so `gRowAttrs` either emits the open handle or
 * marks the row inert — never a hover state over a click that does nothing.
 */
export const CLIENT_GRAPH_CELLS_JS = `
/** Truncation is part of the answer: a capped list that shows a bare prefix
 * reads as "only this many". Never rendered as a row, so it cannot be opened. */
function gTrunc(t) {
	if (!t || !t.truncated) return "";
	var why = (t.reasons || []).join(", ");
	return '<div class="gg-note">Capped (' + esc(why) + ") \\u2014 at least " +
		esc(t.dropped) + " more qualified. This answer is a floor.</div>";
}

function gClip(s, n) {
	s = String(s == null ? "" : s);
	return s.length > n ? s.slice(0, n - 1) + "\\u2026" : s;
}

/** A full sha shortened, a path reduced to its basename; anything else as-is. */
function gShortRef(ref) {
	if (!ref) return "";
	if (/^[0-9a-f]{40}$/.test(ref)) return ref.slice(0, 8);
	return ref.indexOf("/") === -1 ? ref : base(ref);
}

/** The opening promise, kept or refused. A row that opens nothing must not
 * look like a row that does — the pointer is a promise (styles-work.ts). */
function gOpenable(node, ref) {
	if (node && node.file) return true;
	return !!ref && node && node.kind !== "commit";
}
function gRowAttrs(node, ref, why) {
	var open = gOpenable(node, ref);
	return (open ? ' data-open="gnode:' + esc(node.id) + '"' : ' class="gg-inert"') +
		(why ? ' title="' + esc(why) + '"' : "");
}

/** The justification cell. Elided here rather than in CSS: a td cannot be told
 * to shrink beside the one that already claims the free space. */
function gWhy(text) { return '<td class="gg-why">' + esc(gClip(text, 72)) + "</td>"; }

/**
 * Where a node lives, REPO-RELATIVE. The basename alone repeats the label for
 * every file node, which spends a column to say nothing; the absolute path
 * spends the rest of the row on the machine's home directory. The project root
 * comes off the payload, so nothing here parses the node id for it.
 */
function gWhere(node) {
	if (!node.file) return "";
	var root = (typeof G !== "undefined" && G.data && G.data.root) || "";
	var rel = root && node.file.indexOf(root + "/") === 0 ? node.file.slice(root.length + 1) : node.file;
	return gClip(rel, 48) + (node.line ? ":" + node.line : "");
}

/** kind glyph + label + where it lives. The label is the node's, never parsed
 * out of its id. */
function gNodeCell(node) {
	var where = gWhere(node);
	return '<td class="grow"><span class="glyph">' + esc(node.kind) + "</span>" +
		esc(gClip(node.label, 72)) + "</td>" +
		'<td class="mono">' + esc(where) + "</td>";
}

/** The whole audit trail as one string, for the row's title. */
function gPath(path) {
	return (path || []).map(function (e) {
		return e.from + " -" + e.kind + "-> " + e.to;
	}).join("\\n");
}
`;
