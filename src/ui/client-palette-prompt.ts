/**
 * The compose half of the palette: the prompt as a list of blocks you can
 * untick, and the text those ticks produce.
 *
 * Separate from client-palette.ts because it answers a different question —
 * search asks "what happened here", this asks "what of it is worth spending
 * the budget on" — and because a token budget spent in the open is the whole
 * point: every block shows its source, its one-line justification and its
 * cost before it is copied.
 */
export const PALETTE_PROMPT_JS = `
/** The commit card itself, read-only: the evidence behind the row. */
function palCard(h) {
	P.card = h;
	P.prompt = null;
	$("#pal-list").innerHTML = '<div class="pal-block"><label><b>' + esc(h.card.title) +
		'</b><span class="why">' + esc(h.card.project + DOT + h.card.at.slice(0, 10)) +
		'</span><span class="pal-meta">' + esc(h.card.ref.slice(0, 8)) + "</span></label><pre>" +
		esc(h.card.text) + "</pre></div>";
	palNote("commit " + h.card.ref.slice(0, 8) + DOT + "Enter copies the sha" + DOT + "Esc goes back");
}
function palText() {
	var out = "", tokens = 0;
	P.prompt.blocks.forEach(function (b, i) {
		if (P.off[i]) return;
		out += "## " + b.source + "\\n" + b.text.trim() + "\\n\\n";
		tokens += b.tokens;
	});
	if (P.prompt.constraints.length) out += "## Constraints\\n";
	P.prompt.constraints.forEach(function (c) { out += "- " + c + "\\n"; tokens += Math.ceil(c.length / 4); });
	return { text: out, tokens: tokens };
}
function palPrompt() {
	$("#pal-list").innerHTML = P.prompt.blocks.map(function (b, i) {
		return '<div class="pal-block' + (P.off[i] ? " pal-off" : "") + '"><label><input type="checkbox" data-b="' +
			i + '"' + (P.off[i] ? "" : " checked") + "/><b>" + esc(b.source) + '</b><span class="why">' +
			esc(b.why) + '</span><span class="pal-meta">' + b.tokens + "t</span></label><pre>" +
			esc(b.text.slice(0, 400)) + "</pre></div>";
	}).join("") + P.prompt.constraints.map(function (c) {
		return '<div class="pal-con">' + esc(c) + "</div>";
	}).join("");
	palNote(palText().tokens + " tokens" + DOT + P.prompt.omitted + " omitted" + DOT + "Enter copies");
}
function palCompose() {
	var q = $("#pal-q").value.trim();
	if (!q) return;
	palNote("composing\\u2026");
	getJson("/api/history/prompt?budget=4000" + palScope() + "&task=" + encodeURIComponent(q))
		.then(function (p) { P.prompt = p; P.off = {}; palPrompt(); }, function () { palNote("compose failed"); });
}
`;
