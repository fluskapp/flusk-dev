/**
 * The extension loader: the file that finally makes ah hackable.
 *
 * WHY THIS FILE EXISTS: src/ext/types.ts has described the seam for a while and
 * nothing ever loaded anything. This walks `~/.ah/extensions/*.js` then
 * `<repo>/.ah/extensions/*.js`, runs each setup, and hands back what they
 * registered.
 *
 * Two rules hold the whole thing up, and both are load-bearing:
 *
 *  - TRUST (see trust.ts). Global extensions are the user's own and load
 *    freely. Project extensions are code shipped by a repo, so they load only
 *    for a project the user has vouched for, and a skip is REPORTED — an
 *    invisible refusal is how "ah ignores my extension" becomes an hour of
 *    debugging, and how a security boundary quietly rots.
 *  - ISOLATION. Import and setup happen inside try/catch per file. A broken
 *    extension is recorded in `failures` and skipped; its neighbours still
 *    load and the agent still runs. An extension point that can kill the agent
 *    is worse than no extension point.
 *
 * Nothing here throws for extension-authored reasons; the ExtensionLoad result
 * carries every failure, matching the provider/tool convention of this repo.
 */
import { loadConfig } from "../config/config.js";
import type { AhConfig } from "../config/types.js";
import type { EventBus } from "../core/events.js";
import { ahHome } from "../session/paths.js";
import { type ApiSink, createExtensionApi } from "./api.js";
import { type Candidate, discoverExtensions } from "./discover.js";
import { importSetup } from "./import-setup.js";
import { isProjectTrusted, untrustedReason } from "./trust.js";
import type { ExtensionLoad, LoadedExtension } from "./types.js";

export interface LoadExtensionsOptions {
	repoRoot: string;
	/** Defaults to loadConfig(repoRoot); pass the run's config to avoid re-reading. */
	config?: AhConfig;
	/** The `--no-extensions` escape hatch: load nothing at all, for one command. */
	noExtensions?: boolean;
	/** Bus extension handlers subscribe to. Omit to inspect without wiring. */
	events?: EventBus;
	onFlow?: (spec: unknown, extension: string) => void;
	log?: (line: string) => void;
}

const detail = (err: unknown): string => (err instanceof Error ? err.message : String(err));

function skipped(candidate: Candidate, error: string): LoadedExtension {
	return { ...candidate, error, tools: [], flows: [], events: [] };
}

export async function loadExtensions(opts: LoadExtensionsOptions): Promise<ExtensionLoad> {
	const load: ExtensionLoad = { extensions: [], tools: [], failures: [] };
	if (opts.noExtensions) return load;

	const config = opts.config ?? loadConfig(opts.repoRoot);
	const sink: ApiSink = {
		config,
		home: ahHome(),
		repoRoot: opts.repoRoot,
		events: opts.events,
		onFlow: opts.onFlow,
		log: opts.log,
	};
	// Evaluated once: whether the project is trusted cannot change midway
	// through a load, and asking per file would invite a TOCTOU race.
	const projectTrusted = isProjectTrusted(opts.repoRoot);

	for (const candidate of await discoverExtensions(opts.repoRoot)) {
		if (candidate.error !== undefined) {
			load.extensions.push(skipped(candidate, candidate.error));
			load.failures.push({ source: candidate.source, error: candidate.error });
			continue;
		}
		if (candidate.scope === "project" && !projectTrusted) {
			// Recorded, not a failure: nothing went wrong, ah refused on purpose.
			// It lands in `extensions` with a reason so `ah doctor` can say so.
			load.extensions.push(skipped(candidate, untrustedReason(opts.repoRoot)));
			continue;
		}
		const { api, record } = createExtensionApi(candidate.name, sink);
		try {
			const setup = await importSetup(candidate.source);
			await setup(api);
		} catch (err) {
			// Partial registrations from a setup that threw halfway are dropped
			// with it: half an extension is not a state anyone can reason about.
			load.extensions.push(skipped(candidate, detail(err)));
			load.failures.push({ source: candidate.source, error: detail(err) });
			continue;
		}
		load.extensions.push({
			...candidate,
			tools: record.toolNames,
			flows: record.flows,
			events: record.events,
		});
		// Order is the load order, so a project extension registering an existing
		// name lands last and wins in the ToolRegistry's Map.
		load.tools.push(...record.tools);
	}
	return load;
}
