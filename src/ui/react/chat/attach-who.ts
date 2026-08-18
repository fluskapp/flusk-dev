/**
 * WHO answers, migrated from ask-who.ts: the picker's choice and what each row
 * discloses. The provenance text is not cosmetic — a `project` agent is a
 * prompt a CLONED REPOSITORY wrote, and the picker must say so.
 */
import type { Answerer } from "../../../features/orchestra/ask.functions.js";
import { AT, WHO_KEY } from "./attach-store.js";

/** Keep the current choice, then the remembered one, then the first usable. */
export function pickWho(): void {
	const usable = AT.answerers.filter((a) => a.available);
	const has = (id: string): boolean => usable.some((a) => a.id === id);
	let saved = "";
	try {
		saved = localStorage.getItem(WHO_KEY) ?? "";
	} catch {
		saved = "";
	}
	AT.who = (has(AT.who) ? AT.who : "") || (has(saved) ? saved : "") || (usable[0]?.id ?? "");
}

/** The selected row, or null. Everything that discloses reads it. */
export function whoRow(): Answerer | null {
	return AT.answerers.find((a) => a.id === AT.who) ?? null;
}

/** Who wrote this agent's prompt. Backends have no author, so they say nothing. */
export function scopeText(a: Answerer | null): string {
	if (a === null || a.kind !== "agent") return "";
	return a.scope === "project" ? "from this repo" : a.scope === "global" ? "yours" : "";
}

/** The model behind the name, and where the name came from. */
export function whoViaText(): string {
	const who = whoRow();
	const where = scopeText(who);
	const via = who === null ? "" : who.available ? (who.via ?? "") : (who.note ?? "unavailable");
	return where !== "" && via !== "" ? `${where} · ${via}` : where !== "" ? where : via;
}

/** The empty roster's honest line: a real failure keeps its message, a list
 * that has not arrived yet says so, and only a RESOLVED empty list claims no
 * backend exists — and then it names the fix. */
export function whoEmptyLabel(loaded: boolean, err: string): string {
	if (err !== "") return err;
	if (!loaded) return "detecting backends…";
	return "No chat backend found — install claude or codex, or add chat.backends in ~/.flusk/config.json";
}

/** One picker row's visible label, unavailable reasons included. */
export function whoOptionLabel(a: Answerer): string {
	const where = scopeText(a);
	return (
		a.label +
		(where !== "" ? ` — ${where}` : "") +
		(a.kind === "agent" && a.via !== undefined ? ` — via ${a.via}` : "") +
		(a.available ? "" : ` — ${a.note ?? "unavailable"}`)
	);
}
