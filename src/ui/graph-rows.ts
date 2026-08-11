/**
 * Turning ingested facts back into run rows. Split from graph-source.ts so
 * the reading rules — what a run's status is, and how far along it got — can
 * be exercised on a fact array with no client anywhere near them.
 */
import { basename } from "node:path";
import type { MemFact } from "../memory/client-types.js";
import type { RunRow } from "./api-types.js";

/** The id half of a `Type:<id>` term; ids may contain colons (paths). */
export function idOf(term: string): string {
	const i = term.indexOf(":");
	return i === -1 ? term : term.slice(i + 1);
}

/** A `stage` object is "<name>:<status>"; the name may itself contain colons. */
function splitStage(object: string): { name: string; status: string } {
	const i = object.lastIndexOf(":");
	return i === -1
		? { name: object, status: "" }
		: { name: object.slice(0, i), status: object.slice(i + 1) };
}

/** Stage statuses that count as finished — kept identical to run-feed.ts, so
 * a graph-served row and a scanned one read the same. */
const DONE = new Set(["done", "ok", "pass", "passed", "skip", "skipped"]);

/**
 * "8/13 · gate" — done stages over total, plus the stage the run sits on.
 *
 * `stage` is coexist, so a run whose gate went running → done has BOTH facts
 * live; counting them raw reports "2/3 · gate" for a two-stage run and drifts
 * further with every poll of a live journal. One entry per stage NAME, newest
 * assertion winning, is the only reading that agrees with the file.
 */
export function progressOf(stages: MemFact[]): string | undefined {
	if (stages.length === 0) return undefined;
	const newest = new Map<string, string>();
	const oldestFirst = [...stages].sort((a, b) =>
		(a.validFrom ?? "").localeCompare(b.validFrom ?? ""),
	);
	for (const f of oldestFirst) {
		const { name, status } = splitStage(f.object);
		newest.set(name, status);
	}
	const done = [...newest.values()].filter((s) => DONE.has(s.toLowerCase())).length;
	const last = [...newest.keys()].at(-1) ?? "";
	return `${done}/${newest.size}${last === "" ? "" : ` · ${last}`}`;
}

export function buildRows(harness: string, facts: MemFact[]): RunRow[] {
	const runs = facts
		.filter((f) => f.predicate === "ran" && f.subject === `Harness:${harness}`)
		.map((f) => idOf(f.object));
	const rows: RunRow[] = [];
	for (const id of new Set(runs)) {
		const mine = facts.filter((f) => f.subject === `Run:${id}`);
		const outcome = mine.find((f) => f.predicate === "outcome");
		const progress = progressOf(mine.filter((f) => f.predicate === "stage"));
		rows.push({
			id,
			kind: "journal",
			project: harness,
			title: basename(id, ".md"),
			status: outcome?.object ?? "unknown",
			at: outcome?.validFrom ?? "",
			// The run id IS the journal path (src/memory/ingest.ts), which is
			// exactly the handle RunRow.ref is specified to carry.
			ref: id,
			...(progress !== undefined ? { progress } : {}),
		});
	}
	return rows.sort((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
}
