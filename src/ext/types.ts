/**
 * The extension seam — ah's answer to "hackable by design".
 *
 * Until now nothing could be added to ah without forking it: tools live in a
 * DEFAULT_TOOLS array, panels are imports in page.ts, flows are library
 * constants. That is fine for a program you own and fatal for one you want
 * other people (and future you) to bend.
 *
 * An extension is ONE plain JavaScript file dropped in a directory. No build
 * step, no manifest, no registration ceremony — because a seam you have to
 * compile is a seam nobody uses at 1am.
 *
 *   ~/.ah/extensions/*.js        apply everywhere
 *   <repo>/.ah/extensions/*.js   apply to that project only
 *
 * A file default-exports a setup function:
 *
 *   export default (ah) => {
 *     ah.tool({ name: "deploy", description: "…", parameters: …, mode: "sequential",
 *               execute: async (args, ctx) => ({ output: "…" }) })
 *     ah.on("run:end", (e) => ah.log(`finished: ${e.reason}`))
 *   }
 *
 * Guarantees, because an extension point that can break the agent is worse
 * than none: every extension is loaded and invoked inside a try/catch, a
 * failure is reported and skipped rather than propagated, load order is
 * deterministic (global then project, alphabetical), and `--no-extensions`
 * disables the whole mechanism for one command.
 */
import type { AhConfig } from "../config/types.js";
import type { AhEvent } from "../core/events.js";
import type { Tool } from "../tools/tool.js";

/** What an extension may do. Deliberately small — every entry is a promise. */
export interface AhApi {
	/** Register a tool the agent can call, exactly like a built-in. */
	tool(tool: Tool): void;
	/** Subscribe to the agent event bus (run:start, tool:end, run:end, …). */
	on<T extends AhEvent["type"]>(
		type: T,
		handler: (event: Extract<AhEvent, { type: T }>) => void | Promise<void>,
	): void;
	/** Register a named flow spec usable as `ah flow run --flow <name>`. */
	flow(spec: unknown): void;
	/** Read-only view of the resolved configuration. */
	readonly config: AhConfig;
	readonly paths: { home: string; repoRoot: string };
	/** Extension output, prefixed with the extension's name. */
	log(message: string): void;
}

export type ExtensionSetup = (ah: AhApi) => void | Promise<void>;

export interface LoadedExtension {
	name: string;
	/** Absolute path of the file it came from. */
	source: string;
	scope: "global" | "project";
	/** Present when the file failed to load or its setup threw. */
	error?: string;
	tools: string[];
	flows: string[];
	events: string[];
}

export interface ExtensionLoad {
	extensions: LoadedExtension[];
	tools: Tool[];
	/** Failures, kept rather than thrown, so `ah doctor` can show them. */
	failures: { source: string; error: string }[];
}
