/**
 * WHO answers, in the panel: the picker, what each row discloses, and how a
 * failure to even ask the server is reported.
 *
 * Two disclosures live here and neither is cosmetic.
 *
 * PROVENANCE. `<repo>/.flusk/agents/*.md` is a prompt a CLONED REPOSITORY wrote,
 * and api-ask-stream.ts puts it at the head of the message, outside the fenced
 * blocks, where it reads as instruction. Rendering it in the same optgroup as
 * the user's own agents with the same "via" text makes the two
 * indistinguishable — the trust confusion spec-precedence.ts calls a security
 * property. `Answerer.scope` exists to say which, and this is where it is said.
 *
 * A FAILED REQUEST IS NOT AN EMPTY LIST. `no answerer available` is a claim
 * about this machine's configuration; a 500 or a stopped server is a different
 * fact with a different remedy, and the server already sent its reason. The
 * sibling loader in client-ask-context.ts keeps the same rule.
 */
export const CLIENT_ASK_WHO_JS = `
/** Keep the current choice, then the remembered one, then the first usable. */
function askPickWho() {
	var usable = A.answerers.filter(function (a) { return a.available; });
	var has = function (id) { return usable.filter(function (a) { return a.id === id; })[0]; };
	var saved = "";
	try { saved = localStorage.getItem(ASK_WHO_KEY) || ""; } catch (e) { saved = ""; }
	A.who = (has(A.who) && A.who) || (has(saved) && saved) || (usable[0] ? usable[0].id : "");
}

/** The selected row, or null. Everything that discloses reads it. */
function askWho() {
	return A.answerers.filter(function (a) { return a.id === A.who; })[0] || null;
}

/** Who wrote this agent's prompt. Backends have no author, so they say nothing. */
function askScopeText(a) {
	if (!a || a.kind !== "agent") return "";
	return a.scope === "project" ? "from this repo" : a.scope === "global" ? "yours" : "";
}

function askOption(a) {
	var where = askScopeText(a);
	var label = a.label + (where ? " \\u2014 " + where : "") +
		(a.kind === "agent" && a.via ? " \\u2014 via " + a.via : "") +
		(a.available ? "" : " \\u2014 " + (a.note || "unavailable"));
	return '<option value="' + esc(a.id) + '"' + (a.available ? "" : " disabled") +
		(a.id === A.who ? " selected" : "") + ">" + esc(label) + "</option>";
}

function askGroup(title, rows) {
	return rows.length === 0 ? ""
		: '<optgroup label="' + esc(title) + '">' + rows.map(askOption).join("") + "</optgroup>";
}

function askPaintWho() {
	var pick = $("#ask-who");
	if (!pick) return;
	var of = function (kind) { return A.answerers.filter(function (a) { return a.kind === kind; }); };
	pick.innerHTML = A.answerers.length
		? askGroup("Agents", of("agent")) + askGroup("Backends", of("backend"))
		: '<option value="">' + esc(A.whoErr || "no answerer available") + "</option>";
	askPaintVia();
}

/** The model behind the name, and where the name came from: an agent must never
 * hide what actually ran, nor who wrote the prompt that ran it. */
function askPaintVia() {
	var el = $("#ask-via");
	if (!el) return;
	var who = askWho();
	var where = askScopeText(who);
	var via = who ? (who.available ? who.via || "" : who.note || "unavailable") : "";
	el.textContent = where && via ? where + " \\u00b7 " + via : where || via;
	el.title = who && who.description ? who.description : "";
}

async function askLoadAnswerers() {
	var cwd = askCwd();
	try {
		A.answerers = await getJson("/api/ask/answerers" +
			(cwd ? "?repo=" + encodeURIComponent(cwd) : ""));
		A.whoErr = "";
	} catch (e) {
		A.answerers = [];
		A.whoErr = "answerer list unavailable: " + failWhy(e);
	}
	askPickWho();
	askPaintWho();
}
`;
