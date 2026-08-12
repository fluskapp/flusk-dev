/**
 * Every source asked once, and the two ways an item can be rejected before it
 * is ever ranked.
 *
 * Nothing here catches: `ContextSource.gather` is TOTAL by contract (invariant
 * 17) — it owns its I/O failures and returns `{ items: [], status: "failed" }`
 * instead of throwing. Wrapping it in a try/catch anyway would turn a source
 * bug into a silent shrug and cost the report the one sentence that says what
 * broke, so a throw here is left to surface as the contract violation it is.
 *
 * Two rejections happen before ranking because neither is a matter of value:
 * a body that is empty after its source redacted and trimmed it has nothing
 * to quote, and an id already used by another source cannot be rendered
 * without breaking the audit trail that every other invariant is checked
 * through. Both are REPORTED (L2); neither is dropped.
 */
import { collisionOmission, emptyOmission, sameFileOmission } from "./omit.js";
import { coversPath } from "./source-house-rules.js";
import type {
	ContextItem,
	ContextRequest,
	ContextSource,
	Omission,
	SourceResult,
} from "./types.js";

export interface SourceRun {
	source: ContextSource;
	result: SourceResult;
}

export interface Gathered {
	/** Usable items, in source-registration order. */
	items: ContextItem[];
	/** Rejected before ranking, with the reason (L2). */
	omitted: Omission[];
	/** Every registered source, including the ones that returned nothing. */
	runs: SourceRun[];
}

export function gatherAll(sources: readonly ContextSource[], req: ContextRequest): Gathered {
	const items: ContextItem[] = [];
	const omitted: Omission[] = [];
	const runs: SourceRun[] = [];
	const owner = new Map<string, string>();
	const rules = new Map<string, string>();
	for (const source of sources) {
		const result = source.gather(req);
		runs.push({ source, result });
		for (const item of result.items) {
			if (item.body.trim() === "") {
				omitted.push(emptyOmission(item));
				continue;
			}
			const clash = owner.get(item.id);
			if (clash !== undefined) {
				omitted.push(collisionOmission(item, clash));
				continue;
			}
			const quoted = ruleOwner(rules, item);
			if (quoted !== undefined) {
				omitted.push(sameFileOmission(item, quoted));
				continue;
			}
			owner.set(item.id, source.id);
			if (item.path !== undefined && coversPath(item.path)) rules.set(item.path, source.id);
			items.push(item);
		}
	}
	return { items, omitted, runs };
}

/**
 * The one cross-source duplicate the corpus really produces: AGENTS.md and
 * CONTRIBUTING.md are read as FILES by the house-rules source and indexed as
 * doc CARDS by history, so both offer the same document and the block pays
 * twice for it. `coversPath` is the house-rules source's own predicate, reused
 * rather than restated, so the file surface and the card surface cannot drift.
 *
 * Deliberately narrow: two commits touching one file are not duplicates, and
 * only a path that IS a rules document is claimed.
 */
function ruleOwner(rules: Map<string, string>, item: ContextItem): string | undefined {
	if (item.path === undefined || !coversPath(item.path)) return undefined;
	return rules.get(item.path);
}
