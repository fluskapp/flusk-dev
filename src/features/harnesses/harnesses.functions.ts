/**
 * The harness feature's typed server function — the form dropdown's list.
 * `repoRoot` must name a CONFIGURED project root to contribute its project
 * scope (the runconfig membership test, never a prefix test); anything else
 * scans built-ins and ~/.flusk/harnesses only. Type-only re-exports keep
 * this file strippable.
 */
import { resolve } from "node:path";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { expandHome } from "../projects/journal-scan.repository.js";
import { projectRoots } from "../projects/project-scan.repository.js";
import { scanHarnesses } from "./harness-files.repository.js";
import type { HarnessScan } from "./harness.types.js";

export type { HarnessMeta, HarnessScan, HarnessSpec } from "./harness.types.js";

/** The configured root this request names, or null (skips project scope). */
const configRoot = createServerOnlyFn((raw: string): string | null => {
	const path = resolve(expandHome(raw));
	return projectRoots(loadConfig(process.cwd())).includes(path) ? path : null;
});

/** Every harness a config could name; unavailable rows carry their note. */
export const listHarnessConfigs = createServerFn()
	.inputValidator((data: { repoRoot?: string }) => data)
	.handler(async ({ data }): Promise<HarnessScan> => {
		return scanHarnesses(data.repoRoot === undefined ? null : configRoot(data.repoRoot));
	});
