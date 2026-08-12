/**
 * Which sources a run has, and in what order they are read.
 *
 * The list is here rather than inside buildContext because the ORDER is a
 * decision, not an implementation detail: it is the reading order of the
 * pinned blocks, and a pinned block changes how everything after it is read.
 * Rules before the verify chain before the traps — the constraint, then the
 * gate that enforces it, then what already went wrong against it. Reversing
 * them puts a warning in front of the rule it is a warning about.
 *
 * Ranked sources are ordered here too, but only as a tie-break of last resort:
 * their blocks are placed by rank, not by registration.
 *
 * The workspace source defaults to emitting NOTHING, because
 * `buildSystemPrompt` already renders IDENTITY/SOUL/TOOLS verbatim and a
 * second copy in the context block doubles their tokens and hands the model
 * two versions of one rule to reconcile. It stays registered so the report
 * says that in a note rather than leaving a hole (invariant 19). A caller that
 * builds a system prompt without the workspace passes
 * `workspace: { alsoInSystemPrompt: [] }` and gets the pinned items.
 */
import { historySource } from "./source-history.js";
import { houseRulesSource } from "./source-house-rules.js";
import { profileSource } from "./source-profile.js";
import { createRunsSource } from "./source-runs.js";
import { verifySource } from "./source-verify.js";
import { createWorkspaceSource, type WorkspaceSourceOptions } from "./source-workspace.js";
import type { ContextSource } from "./types.js";

export interface RegistryOptions {
	/** The session a resume reopened; without it the newest one for the repo. */
	sessionRef?: string;
	/** Layers the system prompt already read, and which of them it renders. */
	workspace?: WorkspaceSourceOptions;
}

export function defaultSources(opts: RegistryOptions = {}): ContextSource[] {
	return [
		createWorkspaceSource(opts.workspace ?? {}),
		houseRulesSource,
		verifySource,
		historySource(),
		createRunsSource(opts.sessionRef === undefined ? {} : { sessionRef: opts.sessionRef }),
		profileSource,
	];
}
