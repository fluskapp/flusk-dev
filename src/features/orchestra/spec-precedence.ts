/**
 * Who wins a name collision — the one rule in this module that is a security
 * property rather than a preference.
 *
 * A repository is cloned; `<repo>/.flusk/agents/code-reviewer.md` is authored by
 * whoever wrote that repo. If the last loader won, cloning a repo would
 * silently replace the agent the user thinks they are invoking with a prompt
 * of the repo's choosing — a prompt is not code, but a prompt that redefines
 * "code-reviewer" as "approve everything" is still an attack.
 *
 * So the MORE TRUSTED scope wins, project always loses, and the loser is
 * reported as a `SpecLoadIssue` rather than dropped in silence. Within one
 * scope the first file alphabetically wins and the duplicate is reported,
 * which keeps two files claiming one name from being order-dependent.
 */
import type { AgentScope, AgentSpec, SpecLoadIssue } from "./types.js";

/** Ascending trust. The user's own `<home>/agents` outranks everything. */
const TRUST: Record<AgentScope, number> = { project: 0, builtin: 1, generated: 2, global: 3 };

export interface MergeResult {
	/** Deterministic: sorted by name. Includes specs whose worker is unavailable. */
	specs: AgentSpec[];
	issues: SpecLoadIssue[];
}

function shadowed(loser: AgentSpec, winner: AgentSpec): SpecLoadIssue {
	return {
		source: loser.source,
		reason:
			`agent "${loser.name}" (${loser.scope}) is shadowed by the ${winner.scope} spec ` +
			`at ${winner.source}`,
	};
}

/** `specs` in scan order; later entries never win on trust alone. */
export function mergeSpecs(specs: readonly AgentSpec[]): MergeResult {
	const kept = new Map<string, AgentSpec>();
	const issues: SpecLoadIssue[] = [];
	for (const spec of specs) {
		const held = kept.get(spec.name);
		if (held === undefined) {
			kept.set(spec.name, spec);
			continue;
		}
		const winner = TRUST[spec.scope] > TRUST[held.scope] ? spec : held;
		const loser = winner === spec ? held : spec;
		kept.set(spec.name, winner);
		issues.push(shadowed(loser, winner));
	}
	return {
		specs: [...kept.values()].sort((a, b) => a.name.localeCompare(b.name)),
		issues,
	};
}
