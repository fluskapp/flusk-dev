/**
 * The set of agents this repo can delegate to right now: builtins, the user's
 * `<home>/agents/*.md`, flusk's own `<home>/agents/generated/*.md`, and the
 * repository's `<repo>/.flusk/agents/*.md`.
 *
 * A spec file is a PROMPT — markdown with frontmatter. Nothing here eval()s
 * it, imports it, or hands it to a shell, which is the whole reason a
 * project-scoped spec may load while `<repo>/.flusk/extensions/*.js` (arbitrary
 * code) may not: the untrusted layer contributes text, never execution. It
 * contributes no binary either, because `backendId` resolves against
 * `config.chat.backends`, which src/config/config.ts already refuses from the
 * repo layer.
 *
 * Two different failures, deliberately handled differently:
 *  - REFUSED (unparseable, bad name, missing backendId, outside the jail,
 *    shadowed): not registered, reported as a SpecLoadIssue.
 *  - UNAVAILABLE (backendId names a backend this machine has not configured):
 *    still listed, with the reason obtainable from `available()`. Hiding it
 *    would leave the user hunting for an agent that is simply unplugged.
 */
import type { ChatBackend } from "../chat/types.js";
import { specAvailability } from "./availability.js";
import { BUILTIN_SPECS } from "./builtins.js";
import { agentDirs } from "./dirs.js";
import { mergeSpecs } from "./spec-precedence.js";
import { scanAgentDir } from "./spec-scan.js";
import type { AgentRegistry, AgentSpec, SpecLoadIssue, WorkerAvailability } from "./types.js";

export interface RegistryOptions {
	repoRoot: string;
	/** Defaults to `fluskHome()`; overridable so tests use a real temp dir. */
	home?: string;
	/**
	 * Already-resolved backends (`listBackends(loadConfig(repoRoot))`). Passed
	 * in rather than loaded here so this module never reads config itself —
	 * the caller is the one place that applies the trusted/untrusted split.
	 */
	backends?: readonly ChatBackend[];
	builtins?: readonly AgentSpec[];
}

export interface OrchestraRegistry extends AgentRegistry {
	/** Issues from the last `reload()`; empty before the first one. */
	issues(): SpecLoadIssue[];
	/** Never spawns anything: see availability.ts. */
	available(spec: AgentSpec): WorkerAvailability;
}

export function createAgentRegistry(opts: RegistryOptions): OrchestraRegistry {
	const backends = opts.backends ?? [];
	let specs: AgentSpec[] = [];
	let issues: SpecLoadIssue[] = [];

	return {
		list: () => [...specs],
		get: (name) => specs.find((s) => s.name === name),
		issues: () => [...issues],
		available: (spec) => specAvailability(spec, backends),
		reload: async () => {
			const found: AgentSpec[] = [...(opts.builtins ?? BUILTIN_SPECS)];
			const scanIssues: SpecLoadIssue[] = [];
			for (const location of agentDirs(opts.repoRoot, opts.home)) {
				const result = scanAgentDir(location);
				found.push(...result.specs);
				scanIssues.push(...result.issues);
			}
			const merged = mergeSpecs(found);
			specs = merged.specs;
			issues = [...scanIssues, ...merged.issues];
			return [...issues];
		},
	};
}

/** Convenience for callers that only want a loaded registry. */
export async function loadAgentRegistry(opts: RegistryOptions): Promise<OrchestraRegistry> {
	const registry = createAgentRegistry(opts);
	await registry.reload();
	return registry;
}
