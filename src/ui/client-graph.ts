/**
 * The Graph tool window (8) — "what am I about to break".
 *
 * It is an editor tab rather than a rail because it answers with four ranked
 * lists and a drawing, and a 300px rail turns all five into a scrollbar.
 *
 * It FOLLOWS rather than asks: whatever the Documentation window last looked
 * up is what this panel is about, so there is no second symbol picker to keep
 * in step with the first. The hand-off wraps `showSymbolDoc` the way
 * client-doc.ts wraps `codeLookup` — one lookup, two windows. The gestures and
 * the aiming rules are in client-graph-nav.ts; this file is the window.
 *
 * NO STATE HERE IS A BLANK BOX. Nothing selected, nothing built, nothing known
 * about this node, and a request that was refused are four different sentences
 * with four different remedies. The two only the server can tell apart — an
 * unbuilt graph versus a built graph with no such node — arrive as `note` and
 * `action` (api-graph-report.ts), and this file prints them beside a button
 * that does the thing they name. A panel that renders an empty box for any of
 * them is indistinguishable from a broken one.
 */
export const CLIENT_GRAPH_JS = `
/** The subject, the answer, its node index, and the guard on a slow reply. */
var G = { want: null, data: null, byId: {}, seq: 0, building: false };

function graphEmpty(title, note, action) {
	return '<div class="gg-empty"><h3>' + esc(title) + "</h3><p>" + esc(note) + "</p>" +
		(action ? "<p>" + action + "</p>" : "") + "</div>";
}

/** The remedy as a button, not as a sentence about a button. */
function graphBuildBtn(d, label) {
	return '<span class="ev gg-act" data-open="gbuild:' + esc(d.root) + '">' + esc(label) + "</span>";
}

/** What this is about, where it lives, and how big the graph answering is —
 * the denominator that makes "nothing found" mean something. */
function graphHead(d) {
	var t = d.target;
	var name = t ? t.label : base(d.asked.file);
	var where = t && t.file ? t.file + (t.line ? ":" + t.line : "") : d.asked.file;
	return '<div class="gg-head"><span class="gg-name">' + esc(name) + "</span>" +
		'<span class="gg-kind">' + esc(t ? t.kind : (d.asked.symbol ? "symbol" : "file")) +
		"</span>" + '<span class="gg-path">' + esc(where) + "</span>" +
		'<span class="spacer"></span><span class="gg-stat">' + esc(d.project) + ": " +
		esc(d.stats.nodes) + " nodes \\u00b7 " + esc(d.stats.edges) + " edges</span>" +
		graphBuildBtn(d, "Re-index") + "</div>";
}

/** The four sections, or the sentence explaining why there are none. */
function graphBody(d) {
	if (d.state === "ok") return gLocal(d) + gBlast(d) + gCoChange(d) + gProvenance(d);
	return graphEmpty(
		d.state === "unindexed" ? "This project has no graph yet" : "Not in the graph",
		d.note || "",
		esc(d.action || "") + " " + graphBuildBtn(d, "Index this project"));
}

/**
 * Which failure this was, as [title, sentence]. A refusal, a server-side crash
 * and an unreachable server have three different remedies, and the panel used
 * to assert the first one for all three — telling a reader their path is
 * outside their projects when their .flusk.json has a trailing comma.
 */
function graphFail(e, file) {
	var status = (e && e.status) || 0;
	if (status >= 400 && status < 500) {
		return ["No graph for this file", e.reason ||
			("The server would not answer about " + file + ". It answers only about files the " +
			"scanners have already listed, so a path outside your configured projects has none.")];
	}
	if (status) {
		return ["The graph request failed",
			"The server answered HTTP " + status + (e.reason ? ": " + e.reason : "") +
			". That is a failure inside the dashboard, not a refusal about " + file + "."];
	}
	return ["The dashboard could not be reached",
		"The request for " + file + " never completed \\u2014 " + failWhy(e) +
		". Check that \`flusk ui\` is still running."];
}

async function loadGraph() {
	var host = $("#graph");
	var sub = graphSubject();
	if (!sub) {
		host.innerHTML = graphEmpty("Nothing selected",
			"The Graph panel follows the Documentation window. Open a source file \\u2014 from " +
			"the project tree, \\u2318\\u21e7O, or a Find in Files hit \\u2014 and click any " +
			"identifier in it.", "");
		return;
	}
	var seq = ++G.seq;
	host.innerHTML = '<div class="empty small">reading the graph for ' +
		esc(base(sub.file)) + " \\u2026</div>";
	var url = "/api/graph?file=" + encodeURIComponent(sub.file) +
		(sub.symbol ? "&symbol=" + encodeURIComponent(sub.symbol) : "");
	var d = null, err = null;
	try { d = await getJson(url); } catch (e) { err = e; d = null; }
	if (seq !== G.seq) return;
	if (!d || !d.state) {
		var said = graphFail(err, sub.file);
		host.innerHTML = graphEmpty(said[0], said[1], "");
		return;
	}
	G.data = d;
	graphIndex(d);
	host.innerHTML = graphHead(d) + graphBody(d);
	syncCursor();
}

(function graphInit() {
	// The Documentation window owns the lookup; this panel reads the same answer.
	// Wrapping (rather than a second fetch) is what keeps the two in step.
	if (typeof showSymbolDoc === "function") {
		var inner = showSymbolDoc;
		showSymbolDoc = function (p) { graphFollow(p); return inner(p); };
		return;
	}
	// Only when that window is not shipped: its own listener re-enters the
	// wrapper above, so registering both would aim this panel twice per lookup.
	document.addEventListener("flusk-doc", function (e) { graphFollow(e.detail); });
})();
`;
