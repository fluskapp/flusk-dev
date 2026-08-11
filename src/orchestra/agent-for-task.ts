/**
 * "Create an agent when needed": pick an existing agent for a task, or invent
 * one, write it as markdown, and prove it loads.
 *
 * The created spec goes through the ordinary registry — write the file, then
 * `reload()` and look the name up. If the round trip does not find it, the
 * creation FAILED, even though a file exists: an agent that only lives in the
 * variable that made it is exactly the bug this seam exists to prevent, and
 * the reload also proves the bytes we wrote still parse.
 *
 * Nothing here executes the generated file. It is markdown handed to a model
 * as a system prompt; it is never imported, eval'd, or passed to a shell.
 *
 * Talking to the outside (a model draft, a disk write) fails as a VALUE: the
 * caller is an orchestrator that must keep running siblings and report which
 * one failed, not catch.
 */

import type { OrchestraRegistry } from "./registry.js";
import { normaliseDraft, type SpecDrafter } from "./spec-draft.js";
import { MATCH_THRESHOLD, matchAgent } from "./spec-match.js";
import { writeAgentSpec } from "./spec-write.js";
import type { AgentSpec } from "./types.js";

export interface AgentForTaskOptions {
	task: string;
	registry: OrchestraRegistry;
	/** Where a created spec is written: `<repoRoot>/.ah/agents/<name>.md`. */
	repoRoot: string;
	/** Absent (or returning null) = the deterministic offline draft. */
	draft?: SpecDrafter;
	signal?: AbortSignal;
	threshold?: number;
}

export type AgentForTask =
	| { ok: true; spec: AgentSpec; created: boolean; path?: string; reason: string }
	| { ok: false; error: string };

/** A drafter is a model call: a throw from it must not sink the delegation. */
async function propose(opts: AgentForTaskOptions) {
	if (opts.draft === undefined) return null;
	try {
		return await opts.draft(opts.task, opts.signal);
	} catch {
		return null;
	}
}

export async function agentForTask(opts: AgentForTaskOptions): Promise<AgentForTask> {
	const existing = opts.registry.list();
	const match = matchAgent(opts.task, existing, opts.threshold ?? MATCH_THRESHOLD);
	if (match !== undefined) {
		return {
			ok: true,
			spec: match.spec,
			created: false,
			reason: `matched "${match.spec.name}" on description (score ${match.score.toFixed(2)})`,
		};
	}

	const taken = new Set(existing.map((s) => s.name));
	const drafted = await propose(opts);
	const draft = normaliseDraft(drafted, opts.task, taken);
	const written = writeAgentSpec(opts.repoRoot, draft);
	if (!written.ok) return { ok: false, error: written.error };

	await opts.registry.reload();
	const spec = opts.registry.get(draft.name);
	if (spec === undefined) {
		return { ok: false, error: `wrote ${written.path} but the registry did not load it back` };
	}
	return {
		ok: true,
		spec,
		created: true,
		path: written.path,
		reason: `no existing agent fit; created ${draft.name} at ${written.path}`,
	};
}
