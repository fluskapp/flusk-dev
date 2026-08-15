/**
 * The Specs window's pure half: the lifecycle order the sections walk, the
 * filter one row survives, and the task a run composes from a spec — kept
 * view-free so the tests can hold them still.
 */
import type { Spec, SpecMeta, SpecStatus } from "../../../features/specs/spec.types.js";

/** The lifecycle reads left to right; the sections do too. */
export const STATUS_ORDER: SpecStatus[] = ["draft", "planned", "building", "verifying", "done"];

/** What ?status= and ?mode= narrow the list to. */
export interface SpecsFilter {
	status?: string;
	mode?: string;
}

/** A configured project root the window can read specs from. */
export interface RepoChoice {
	name: string;
	path: string;
}

export function specMatches(s: SpecMeta, f: SpecsFilter, q: string): boolean {
	if (f.status !== undefined && s.status !== f.status) return false;
	if (f.mode !== undefined && s.mode !== f.mode) return false;
	if (q === "") return true;
	return `${s.title} ${s.name} ${s.mode}`.toLowerCase().includes(q);
}

/** The surviving specs grouped in lifecycle order, empty sections dropped. */
export function groupSpecs(list: SpecMeta[]): Array<{ status: SpecStatus; rows: SpecMeta[] }> {
	return STATUS_ORDER.map((status) => ({
		status,
		rows: list.filter((s) => s.status === status),
	})).filter((g) => g.rows.length > 0);
}

/** `flusk run --spec`'s contract, composed client-side: the task IS the
 * spec — the title, a blank line, then the body verbatim. */
export const composeTask = (s: Spec): string => `${s.title}\n\n${s.body}`;
