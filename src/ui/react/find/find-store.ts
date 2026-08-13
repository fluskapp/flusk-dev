/**
 * Find in Files state that outlives the strip: the four controls that decide
 * what a query means (scope, file mask, case, regex — remembered, because a
 * workbench that restores your theme and then forgets you work in `*.ts` with
 * Regex on is remembering the wrong things), and the LAST RESULT, which the
 * file viewer's peek reads (`matchesFor`) after the strip has closed.
 *
 * A module store rather than context: the strip unmounts when Find closes,
 * and the peek must still know what Find last found.
 */
import type { FindFile, FindResult } from "../../../features/search/search.functions.js";

const STATE_KEY = "flusk-find-state";

export interface FindControls {
	scope: "project" | "all";
	mask: string;
	cs: boolean;
	re: boolean;
}

let controls: FindControls = { scope: "project", mask: "", cs: false, re: false };
let restored = false;
let result: FindResult | null = null;
let lastQ = "";

/** Scope, mask, case and regex, remembered across reloads (legacy key). */
export function saveControls(next: FindControls): void {
	controls = next;
	restored = true;
	try {
		localStorage.setItem(STATE_KEY, JSON.stringify(next));
	} catch {
		/* private mode */
	}
}

export function loadControls(): FindControls {
	if (restored) return controls;
	restored = true;
	let saved: unknown = null;
	try {
		saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? "null");
	} catch {
		saved = null;
	}
	if (saved !== null && typeof saved === "object") {
		const s = saved as Record<string, unknown>;
		if (s.scope === "all" || s.scope === "project") controls.scope = s.scope;
		controls.mask = typeof s.mask === "string" ? s.mask : "";
		controls.cs = s.cs === true;
		controls.re = s.re === true;
	}
	return controls;
}

/** The last answer, kept for the file viewer's peek. `q` labels it. */
export function keepResult(q: string, r: FindResult | null): void {
	lastQ = q;
	result = r;
}

export function lastResult(): { q: string; result: FindResult | null } {
	return { q: lastQ, result };
}

/** What Find last found in this file, if anything. */
export function matchesFor(path: string): FindFile | null {
	return result?.files.find((f) => f.path === path) ?? null;
}
