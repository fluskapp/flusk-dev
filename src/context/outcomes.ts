/**
 * The per-source half of the report: what each source found, and how much of
 * it survived.
 *
 * Every registered source appears, including the ones that returned nothing
 * (invariant 19). A source that vanishes from the report when it finds nothing
 * is indistinguishable from a source that was never wired up — and those two
 * situations have completely different fixes.
 *
 * The assembler's own losses are filed here as notes rather than as extra
 * omissions: an item that WAS rendered, trimmed, cannot also be an omission
 * without breaking the count that invariant 3 rests on. So the sentence goes
 * on the source that owns the item, where a reader is already looking.
 */
import type { SourceRun } from "./gather.js";
import type { ContextItem, SourceOutcome } from "./types.js";

export interface SourceNote {
	source: string;
	note: string;
}

/**
 * `kept` counts this source's items present in `included`, so the outcomes sum
 * to `included.length` (invariant 20) and a reader can see at a glance which
 * source paid for the block.
 */
export function outcomesOf(
	runs: readonly SourceRun[],
	included: readonly ContextItem[],
	extra: readonly SourceNote[],
): SourceOutcome[] {
	const kept = new Map<string, number>();
	for (const item of included) kept.set(item.source, (kept.get(item.source) ?? 0) + 1);
	return runs.map(({ source, result }) => ({
		...result,
		notes: [...result.notes, ...extra.filter((n) => n.source === source.id).map((n) => n.note)],
		source: source.id,
		label: source.label,
		kept: kept.get(source.id) ?? 0,
	}));
}
