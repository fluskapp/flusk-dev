/**
 * How a card is cited, and what a card's ending is allowed to be CALLED.
 *
 * A warning you cannot check is a rumour, and a warning that misdescribes what
 * happened is worse than none: the composed prompt turns each of these
 * sentences into a "Do not retry …" constraint, so every word of it has to be
 * true of the card it names. Both mistakes were real — an ordinary fix
 * described as having been "reverted or hot-fixed" when nothing had reverted
 * it, and a citation carrying the operator's home directory into a prompt
 * handed to a model.
 */
import { basename } from "node:path";
import type { HistoryCard } from "./types.js";

/** Only a revert says a commit was taken back — and which half of the pair it is. */
const IS_REVERT = /^revert\b|^\w+(\([^)]*\))?!?:\s*revert\b/i;

/**
 * How to open the card — a citation a reader can act on, written
 * PROJECT-RELATIVE. Rendering `card.ref` verbatim put an absolute filesystem
 * path in every block heading of every composed prompt, which carries the
 * operator's username and the on-disk layout of unrelated projects into
 * whatever model receives it; the project plus the path inside it says the
 * same thing to a reader and nothing to anyone else. The absolute ref stays on
 * the card for the local dashboard to open.
 */
export function refLabel(card: HistoryCard): string {
	if (card.kind === "commit") return `commit ${card.ref.slice(0, 8)}`;
	if (card.kind === "session") return `session ${card.ref}`; // already <repo>/<file>
	// A doc or skill knows its repo-relative path; a journal is one file in a
	// runs directory, and its name is the date that distinguishes it.
	const rel = card.kind === "journal" ? basename(card.ref) : (card.paths[0] ?? basename(card.ref));
	return `${card.kind} ${card.project}/${rel}`;
}

function endingOf(card: HistoryCard): string {
	const blocked = card.outcome === "blocked";
	if (card.kind === "journal") return blocked ? "the gate blocked it" : "the run failed";
	if (card.kind === "session")
		return blocked ? "it was denied or aborted part-way" : "the run ended without finishing";
	if (blocked) return "it was held back";
	return IS_REVERT.test(card.title.trim()) ? "it undid earlier work" : "it was reverted afterwards";
}

/** One sentence: what was attempted, how it ended, and where to read it. */
export function trapLine(card: HistoryCard): string {
	const what = (card.title.split("\n")[0] ?? "").trim().slice(0, 100);
	if (what === "" || card.ref === "") return "";
	return `Tried "${what}" in ${card.project} — ${endingOf(card)} (${refLabel(card)}).`;
}
