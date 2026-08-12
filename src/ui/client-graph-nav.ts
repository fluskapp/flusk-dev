/**
 * The Graph window's gestures: what it is aimed at, what a row opens, and the
 * one write it can make.
 *
 * THE SYMBOL TRAP lives here, in `graphFollow`. A symbol node is
 * `symbol:<project>/<rel>#<name>` where `<rel>` is the file the symbol is
 * DEFINED in. Sending the file you happened to be READING when you clicked
 * mints an id nothing has ever put, and the panel would then report "not in
 * the graph" about a symbol that is perfectly well indexed. With no definition
 * known it aims at the file instead, which is always true.
 *
 * Opening is a promise the panel must be able to keep: a commit node names no
 * file this server can serve, so its row copies rather than pretending to
 * navigate (client-graph-rows.ts renders it inert to match).
 */
export const CLIENT_GRAPH_NAV_JS = `
/** Every node the payload mentions, so a click can open what a row names
 * without every row carrying a copy of it. Refs come from provenance alone —
 * they are the HistoryCard join, and no other section has one. */
function graphIndex(d) {
	G.byId = {};
	var keep = function (node, ref) {
		if (node && node.id && !G.byId[node.id]) G.byId[node.id] = { node: node, ref: ref || null };
	};
	if (d.target) keep(d.target, null);
	((d.blast && d.blast.impacted) || []).forEach(function (r) { keep(r.node, null); });
	((d.cochange && d.cochange.peers) || []).forEach(function (p) {
		keep(p.node, null);
		(p.evidence || []).forEach(function (n) { keep(n, null); });
	});
	((d.provenance && d.provenance.rows) || []).forEach(function (r) { keep(r.node, r.ref); });
	((d.local && d.local.nodes) || []).forEach(function (n) { keep(n.node, null); });
}

/** A row opens the file it names, at its line. */
function openGraphNode(id) {
	var hit = G.byId[id];
	if (!hit) return;
	var n = hit.node;
	if (n.file) { openFile(n.file, n.line || 0, G.data && G.data.project); return; }
	if (hit.ref && n.kind !== "commit") { openRef(hit.ref, n.label); return; }
	copyText(n.label, "Copied " + n.kind);
}

/** Point the panel at something. Reloads only when it is the tab on screen. */
function graphAim(file, symbol) {
	if (!file) return;
	G.want = { file: file, symbol: symbol || null };
	var t = activeTab();
	if (t && t.kind === "graph") loadGraph();
}

/** The Documentation window's payload, read for the two fields that identify
 * a node. A lookup that found nothing still re-aims at the file. */
function graphFollow(p) {
	var doc = p && p.doc;
	var defined = doc && doc.defined;
	graphAim((defined && defined.file) || (p && p.file) || "", defined ? doc.name : null);
}

/**
 * The file the EDITOR is showing. S.tabs is in insertion order and nothing ever
 * reorders it, so its last entry is the file opened last, not the one on screen
 * — re-activating an older tab left the Graph panel answering about a file the
 * reader had navigated away from. C.file is what renderCode last painted, which
 * is what askOnScreen already trusts; the tab list is only the fallback.
 */
function graphOnScreen() {
	var open = typeof C !== "undefined" && C && C.file ? C.file : "";
	if (open) return open;
	var t = activeTab();
	if (t && t.kind === "file") return t.ref;
	var files = S.tabs.filter(function (x) { return x.kind === "file"; });
	var last = files[files.length - 1];
	return last ? last.ref : "";
}

/** With nothing looked up yet, the file on screen is the honest default. */
function graphSubject() {
	if (G.want) return G.want;
	var file = graphOnScreen();
	return file ? { file: file, symbol: null } : null;
}

/**
 * "Show me the Graph panel" from the toolbar, 8, \\u23188 or g. It means "about
 * whatever is open NOW", so an aim at some other file is dropped — but the
 * symbol you clicked one second ago IS what is open now, and discarding it made
 * the two halves of one advertised gesture (click an identifier, then press 8)
 * contradict each other. Re-deriving from the editor recovers the file only.
 */
function graphReaim() {
	if (G.want && G.want.file !== graphOnScreen()) G.want = null;
}

/**
 * The empty state's remedy, actually performed. One pass is bounded and
 * resumable, so the button can be pressed again to continue rather than having
 * to finish a large repo in one go — which is why the toast reports what is
 * left rather than claiming completion.
 */
async function graphBuild(root) {
	if (G.building) { toast("Already indexing"); return; }
	G.building = true;
	setActivity("indexing the graph");
	toast("Indexing \\u2014 this reads one bounded slice of files");
	try {
		var r = await fetch("/api/graph/build?repo=" + encodeURIComponent(root), { method: "POST" });
		var rep = await r.json();
		// A build that could not write its log, or refused an over-cap project,
		// answers 200 with \`reason\` and never \`error\` (src/graph/build.ts). Reading
		// only \`error\` reported those as a successful index of zero files, so the
		// button could be pressed forever while the one sentence saying why was
		// thrown away.
		var why = rep.error || rep.reason;
		toast(why
			? "Index incomplete: " + why + " (" + (rep.filesIndexed || 0) + " file(s) read, " +
				(rep.filesRemaining || 0) + " remaining)"
			: "Indexed " + rep.filesIndexed + " file(s), " + rep.filesRemaining + " remaining");
	} catch (e) { toast("Index failed"); }
	G.building = false;
	setActivity("");
	loadGraph();
}
`;
