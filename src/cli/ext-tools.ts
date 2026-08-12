/**
 * The wire between the extension loader and a run — the piece whose absence
 * made src/ext/ dead code.
 *
 * `loadExtensions` walked the two directories, honoured the trust boundary and
 * returned tools correctly, and nothing in src/ ever called it: `flusk run` handed
 * `createAgent` the hardcoded DEFAULT_TOOLS, so a working
 * `~/.flusk/extensions/*.js` registered a tool the agent could never call and said
 * nothing about it. This file is the single seam every run command goes through
 * so that cannot happen once and be missed everywhere else.
 *
 * A SKIP IS ANNOUNCED, ALWAYS. An untrusted project extension is a deliberate
 * refusal (S1: `<repo>/.flusk/extensions/*.js` is arbitrary code shipped by a repo
 * you may have just cloned), and a refusal nobody is told about is
 * indistinguishable from a bug in the loader. The same goes for an extension
 * whose import or setup threw: `loadExtensions` never throws, so the failure
 * reaches a human only if it is printed here.
 *
 * Extension tools come AFTER the built-ins, matching the loader's own ordering
 * note: the ToolRegistry is a Map, so a later registration of an existing name
 * wins, and an extension is allowed to replace a built-in on purpose.
 */
import type { FluskConfig } from "../platform/config/types.js";
import type { EventBus } from "../platform/events/events.js";
import { loadExtensions } from "../features/extensions/load.js";
import type { Tool } from "../features/tools/tool.js";
import { DEFAULT_TOOLS } from "./run-support.js";

export interface ExtToolsOpts {
	repoRoot: string;
	/** The run's already-resolved config, so the loader does not re-read it. */
	config: FluskConfig;
	/** Handlers subscribe to this; omit to inspect without wiring. */
	events?: EventBus;
	/** `--no-extensions`: load nothing at all, for one command. */
	noExtensions?: boolean;
	out?: NodeJS.WritableStream;
	quiet?: boolean;
}

/** DEFAULT_TOOLS plus whatever the extensions registered, failures reported. */
export async function toolbelt(opts: ExtToolsOpts): Promise<Tool[]> {
	const load = await loadExtensions({
		repoRoot: opts.repoRoot,
		config: opts.config,
		...(opts.events === undefined ? {} : { events: opts.events }),
		...(opts.noExtensions === true ? { noExtensions: true } : {}),
		...(opts.quiet === true ? {} : { log: (line) => write(opts, `${line}\n`) }),
	});
	for (const ext of load.extensions) {
		if (ext.error !== undefined) write(opts, `flusk: extension ${ext.name} skipped — ${ext.error}\n`);
	}
	return [...DEFAULT_TOOLS, ...load.tools];
}

function write(opts: ExtToolsOpts, line: string): void {
	if (opts.quiet === true) return;
	(opts.out ?? process.stderr).write(line);
}
