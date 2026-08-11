/**
 * The local neighbourhood, drawn — inline SVG, no library, no network (the
 * page ships under a strict CSP and there is nothing to fetch a layout engine
 * from anyway).
 *
 * LEGIBLE BEATS PRETTY, and that is a layout decision, not a stylesheet one:
 *
 *  - It is a STAR, laid out in two columns. Neighbours whose edge ARRIVES at
 *    the centre stack on the left (they are the ones a change here implicates);
 *    neighbours the centre points AT stack on the right. Rows are a fixed
 *    pitch apart and every label sits at a fixed x, so two labels cannot
 *    overlap by construction — no force simulation, no collision pass, no
 *    frame where the picture is unreadable.
 *  - Edges BETWEEN two neighbours are counted and not drawn. They are exactly
 *    what turns a star into a hairball, and the count is stated underneath so
 *    the omission is visible rather than silent.
 *  - Past DRAW_MAX rows a column stops being readable at this width, so the
 *    diagram is dropped for the ranked list. Degrading is the honest move: a
 *    picture nobody can read is worse than a list everybody can.
 *
 * The coordinate system is 880 user units wide and the element is 100% wide,
 * so a user unit is about a CSS pixel in the editor area — which is why the
 * font sizes below are in user units and read at their nominal size. Every
 * COLOUR is a class, defined against theme tokens in styles-graph.ts; there is
 * not one literal colour here.
 *
 * The table under the picture is the keyboard surface (`tbody tr[data-open]`);
 * the diagram is the overview, and its rows are clickable but not cursor rows.
 */
export const CLIENT_GRAPH_DRAW_JS = `
/** Layout, in user units. DRAW_MAX is a legibility bound, not a data bound. */
var GG = {
	W: 880, ROW: 26, TOP: 30, FOOT: 14,
	LX: 296, LD: 320, CX: 440, RD: 560, RX: 584,
	LABEL: 30, DRAW_MAX: 12,
};

/**
 * Which side a neighbour belongs on, from the FIRST hop of its own path —
 * which is the edge that touches the centre whatever the radius is. Reading it
 * off local.edges instead would break the moment the radius grows past 1.
 */
function ggSide(n, root) {
	var e = (n.path || [])[0];
	if (!e) return null;
	return { inbound: e.to === root, kind: e.kind, edge: e };
}

function ggText(x, y, cls, anchor, size, s) {
	return '<text x="' + x + '" y="' + y + '" class="' + cls + '" text-anchor="' + anchor +
		'" font-size="' + size + '">' + esc(s) + "</text>";
}

/** One neighbour: the dot, its two text runs, and the curve back to the centre. */
function ggRow(n, side, y, cy) {
	var dot = side.inbound ? GG.LD : GG.RD;
	var c1 = side.inbound ? dot + 44 : dot - 44;
	var c2 = side.inbound ? GG.CX - 44 : GG.CX + 44;
	var cls = n.node.kind === "commit" || n.node.kind === "run" ? "gg-hist" : "gg-struct";
	return '<g class="gg-n" data-open="gnode:' + esc(n.node.id) + '">' +
		'<path class="gg-edge" d="M' + dot + " " + y + " C" + c1 + " " + y + "," + c2 + " " + cy +
		"," + GG.CX + " " + cy + '"/>' +
		'<circle class="gg-dot ' + cls + '" cx="' + dot + '" cy="' + y + '" r="4"/>' +
		ggText(side.inbound ? GG.LX : GG.RX, y + 4, "gg-label", side.inbound ? "end" : "start", 12.5,
			gClip(n.node.label, GG.LABEL)) +
		ggText(side.inbound ? 18 : GG.W - 18, y + 4, "gg-ek", side.inbound ? "start" : "end", 11,
			side.kind) +
		"</g>";
}

/** The star. Returns "" when there is nothing worth drawing. */
function ggDraw(local) {
	var left = [], right = [];
	(local.nodes || []).forEach(function (n) {
		var s = ggSide(n, local.root);
		if (!s) return;
		(s.inbound ? left : right).push({ n: n, s: s });
	});
	if (!left.length && !right.length) return "";
	var rows = Math.max(left.length, right.length);
	if (rows > GG.DRAW_MAX) return "";
	var h = GG.TOP + rows * GG.ROW + GG.FOOT;
	var cy = GG.TOP + (rows * GG.ROW) / 2;
	var body = "";
	[left, right].forEach(function (col) {
		col.forEach(function (item, i) { body += ggRow(item.n, item.s, GG.TOP + i * GG.ROW + 13, cy); });
	});
	var name = local.center ? local.center.label : base(local.root);
	body += '<circle class="gg-dot gg-center" cx="' + GG.CX + '" cy="' + cy + '" r="7"/>' +
		ggText(GG.CX, cy - 14, "gg-center-label", "middle", 12.5, gClip(name, 28));
	return '<svg class="gg-svg" viewBox="0 0 ' + GG.W + " " + h + '" role="img" ' +
		'aria-label="Local graph around ' + esc(name) + '">' +
		ggText(GG.LX, 16, "gg-cap", "end", 11, "arrives here") +
		ggText(GG.RX, 16, "gg-cap", "start", 11, "leaves here") + body + "</svg>";
}

/** Why the picture is absent, said plainly rather than left blank. */
function ggWhyNoDraw(local) {
	var n = (local.nodes || []).length;
	if (!n) return "";
	return '<div class="gg-note">' + esc(n) + " neighbours is past what stays readable as a " +
		"diagram at this width, so the ranked list below is the picture.</div>";
}

/** The section: the star when it is legible, and always the list under it. */
function gLocal(d) {
	var local = d.local;
	if (!local) return "";
	if (!local.nodes.length) {
		return sec("Neighbourhood", '<div class="gg-none">This node has no edges at all in the ' +
			"graph \\u2014 it was indexed, but nothing imports it, defines into it, or has " +
			"touched it.</div>", 0);
	}
	var drawn = ggDraw(local);
	// Counted from the triples, not from (edges - nodes): a neighbour joined to
	// the centre by two kinds at once would make that arithmetic go negative.
	var touching = local.edges.filter(function (e) {
		return e.from === local.root || e.to === local.root;
	}).length;
	var between = local.edges.length - touching;
	var hidden = between > 0
		? '<div class="gg-note">' + esc(between) + " further edge(s) between these neighbours are " +
			"counted and not drawn \\u2014 they are what turns a star into a hairball.</div>"
		: "";
	var rows = local.nodes.map(function (n) {
		var s = ggSide(n, local.root) || { inbound: false, kind: n.via };
		var why = (s.inbound ? "\\u2192 this" : "this \\u2192") + " via " + s.kind;
		return "<tr" + gRowAttrs(n.node, null, gPath(n.path)) + ">" +
			'<td class="mono">' + esc(s.inbound ? "in" : "out") + "</td>" + gNodeCell(n.node) +
			gWhy(why + " \\u00b7 degree " + n.degree) + "</tr>";
	}).join("");
	var head = "<tr><th>dir</th><th>neighbour</th><th>at</th><th>evidence</th></tr>";
	return sec("Neighbourhood",
		(drawn || ggWhyNoDraw(local)) + hidden + tbl(head, rows) + gTrunc(local.truncation),
		local.nodes.length);
}
`;
