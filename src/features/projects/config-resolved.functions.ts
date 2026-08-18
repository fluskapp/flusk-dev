/**
 * The Config window's server function: one project's effective config with
 * per-key provenance, its `.flusk` tree, and the workbench-file notes — the
 * truthful replacement for the raw dual-JSON blob.
 */
import { basename } from "node:path";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import {
	resolveConfig,
	type ResolvedConfig as Resolved,
	type ResolvedKey as Key,
} from "../../platform/config/provenance.js";
import { readWorkbenchFile } from "../workbench/workbench-file.repository.js";
import { projectRoots } from "./project-scan.repository.js";
import { scanDotFlusk, type DotFluskEntry } from "./dot-flusk.repository.js";

export type { Origin } from "../../platform/config/provenance.js";
export type { DotFluskEntry, DotFluskKind } from "./dot-flusk.repository.js";

/**
 * The wire shape: provenance.ts types values as `unknown`, which the
 * server-function serializer refuses to promise about — but they are parsed
 * from JSON files, so JSON is what they are (the detail.functions.ts idiom).
 */
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type ResolvedKey = Omit<Key, "value"> & { value: Json };
export type ResolvedConfig = Omit<Resolved, "keys"> & { keys: ResolvedKey[] };

export interface ConfigResolvedReply {
	root: string;
	resolved: ResolvedConfig;
	tree: DotFluskEntry[];
	workbenchNotes: string[];
}

/** The configured root the name points at — the projectDetail membership rule. */
const rootOf = createServerOnlyFn((name: string): string | null => {
	const roots = projectRoots(loadConfig(process.cwd()));
	return roots.find((r) => (basename(r) || r) === name) ?? null;
});

/** null when the config does not name a project by that name. */
export const getConfigResolved = createServerFn()
	.inputValidator((data: { name: string }) => data)
	.handler(async ({ data }): Promise<ConfigResolvedReply | null> => {
		const root = rootOf(data.name);
		if (root === null) return null;
		return {
			root,
			resolved: resolveConfig(root) as ResolvedConfig,
			tree: scanDotFlusk(root),
			workbenchNotes: readWorkbenchFile(root).notes,
		};
	});
