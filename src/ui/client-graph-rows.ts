/**
 * The three ranked lists of the Graph tool window: BLAST RADIUS, CO-CHANGE and
 * PROVENANCE. The cell vocabulary they are written in is client-graph-cells.ts.
 *
 * THE RULE THIS FILE IS WRITTEN AROUND: no row states a relationship without
 * the triples that produced it. A ranked list a reader cannot audit is a list
 * they cannot trust — they have to take "b.ts is in your blast radius" on
 * faith, and one wrong edge then poisons every answer built on it. So every
 * row carries a why-cell derived from the payload's own evidence: the hop
 * chain for a walked row, the re-confirmed commits for a score, the joined
 * card date and ref for a provenance row. The `title` attribute carries the
 * raw triples, because the full chain does not fit in a cell and eliding it
 * away would elide the audit trail.
 *
 * Each empty section prints a SENTENCE rather than an empty table: "no
 * importers" and "history was never folded in" are different facts with
 * different remedies, and a blank box states neither.
 *
 * Rows are `<tr data-open>` inside a `tbody` because that selector IS the
 * keyboard cursor (client-cursor.ts), so j/k/Enter work here for free.
 */
export const CLIENT_GRAPH_ROWS_JS = `
/** BLAST RADIUS: inbound imports/references/defines, nearest first. */
function gBlast(d) {
	var b = d.blast;
	if (!b) return "";
	if (!b.impacted.length) {
		return sec("Blast radius", '<div class="gg-none">Nothing imports, references or defines ' +
			"this \\u2014 no other indexed file is implicated by changing it." +
			(b.unresolved ? " " + esc(b.unresolved) + " edge(s) point at nodes nothing has indexed yet." : "") +
			"</div>", 0);
	}
	var rows = b.impacted.map(function (r) {
		// The hop kinds, not the hop ids: an intermediate node has an id and no
		// label, and ids are opaque (invariant 2) — splitting one to invent a
		// prettier label is exactly the guess this panel must not make. The
		// full triple chain is on the row's title.
		var chain = r.path.map(function (e) { return e.kind; }).join(" \\u2190 ");
		return "<tr" + gRowAttrs(r.node, null, gPath(r.path)) + ">" +
			'<td class="num">' + esc(r.depth) + "</td>" + gNodeCell(r.node) +
			gWhy(chain + " \\u00b7 strength " + (Math.round(r.score * 100) / 100)) + "</tr>";
	}).join("");
	var head = "<tr><th class=\\"num\\">hops</th><th>implicated</th><th>at</th><th>via</th></tr>";
	return sec("Blast radius", tbl(head, rows) + gTrunc(b.truncation), b.impacted.length);
}

/** CO-CHANGE: what historically moves with this, and the commits proving it. */
function gCoChange(d) {
	var c = d.cochange;
	if (!c) return "";
	if (!c.peers.length) {
		return sec("Co-change", '<div class="gg-none">Nothing has moved with this file in the ' +
			"indexed history. Either no commit touched it alongside another file, or history " +
			"has not been folded in yet \\u2014 sweeping commits (over 25 paths) are skipped " +
			"deliberately.</div>", 0);
	}
	var rows = c.peers.map(function (p) {
		var proof = p.evidence.map(function (n) { return gClip(n.label, 40); }).join(" \\u00b7 ");
		var why = p.confirmed + " of " + p.commits + " re-confirmed from touched_by on both ends" +
			(proof ? "\\n" + proof : "");
		return "<tr" + gRowAttrs(p.node, null, why) + ">" +
			'<td class="num">' + esc(p.commits) + "</td>" + gNodeCell(p.node) +
			gWhy(p.confirmed + " confirmed \\u00b7 " + Math.round(p.score * 100) + "% of the " +
				c.commitsTouchingRoot + " commits touching this" +
				(proof ? " \\u00b7 " + proof : "")) + "</tr>";
	}).join("");
	var head = "<tr><th class=\\"num\\">commits</th><th>moves with</th><th>at</th><th>evidence</th></tr>";
	return sec("Co-change", tbl(head, rows) + gTrunc(c.truncation), c.peers.length);
}

/** PROVENANCE: the commits, runs and docs that touched this, newest first. */
function gProvenance(d) {
	var p = d.provenance;
	if (!p) return "";
	if (!p.rows.length) {
		return sec("Provenance", '<div class="gg-none">No commit, run or document is attached ' +
			"to this yet. The history fold attaches them; a file added since the last index has " +
			"none.</div>", 0);
	}
	var rows = p.rows.map(function (r) {
		var why = r.relation + " \\u00b7 " + r.edge.from + " -" + r.edge.kind + "-> " + r.edge.to;
		return "<tr" + gRowAttrs(r.node, r.ref, why) + ">" +
			'<td class="mono">' + esc(r.at ? fmtTime(r.at) : "\\u2014") + "</td>" +
			gNodeCell(r.node) +
			gWhy(r.relation + (r.ref ? " \\u00b7 " + gShortRef(r.ref) : " \\u00b7 no card matched")) +
			"</tr>";
	}).join("");
	var head = "<tr><th>when</th><th>touched by</th><th>at</th><th>evidence</th></tr>";
	var order = p.ordered === "history" ? "" :
		'<div class="gg-note">Ordered by id, not by time: no history corpus was available to ' +
		"date these.</div>";
	return sec("Provenance", tbl(head, rows) + order + gTrunc(p.truncation), p.rows.length);
}
`;
