/**
 * WHO answers: the picker's choice and what each row discloses. Ported from
 * client-ask-who.ts — the provenance text is not cosmetic: a `project` agent
 * is a prompt a CLONED REPOSITORY wrote, and the picker must say so.
 */
import type { Answerer } from "../../../features/orchestra/ask.functions.js";
import { A, ASK_WHO_KEY } from "./ask-store.js";

/** Keep the current choice, then the remembered one, then the first usable. */
export function askPickWho(): void {
	const usable = A.answerers.filter((a) => a.available);
	const has = (id: string): boolean => usable.some((a) => a.id === id);
	let saved = "";
	try {
		saved = localStorage.getItem(ASK_WHO_KEY) ?? "";
	} catch {
		saved = "";
	}
	A.who = (has(A.who) ? A.who : "") || (has(saved) ? saved : "") || (usable[0]?.id ?? "");
}

/** The selected row, or null. Everything that discloses reads it. */
export function askWho(): Answerer | null {
	return A.answerers.find((a) => a.id === A.who) ?? null;
}

/** Who wrote this agent's prompt. Backends have no author, so they say nothing. */
export function askScopeText(a: Answerer | null): string {
	if (a === null || a.kind !== "agent") return "";
	return a.scope === "project" ? "from this repo" : a.scope === "global" ? "yours" : "";
}

/** One picker row's visible label, unavailable reasons included. */
export function askOptionLabel(a: Answerer): string {
	const where = askScopeText(a);
	return (
		a.label +
		(where !== "" ? ` — ${where}` : "") +
		(a.kind === "agent" && a.via !== undefined ? ` — via ${a.via}` : "") +
		(a.available ? "" : ` — ${a.note ?? "unavailable"}`)
	);
}

/** The model behind the name, and where the name came from. */
export function askViaText(): string {
	const who = askWho();
	const where = askScopeText(who);
	const via = who === null ? "" : who.available ? (who.via ?? "") : (who.note ?? "unavailable");
	return where !== "" && via !== "" ? `${where} · ${via}` : where !== "" ? where : via;
}
