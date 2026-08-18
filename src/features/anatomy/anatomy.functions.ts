/**
 * The Harness window's typed server function: one report, config-cheap on
 * purpose. Goals ride separately (goals.functions.ts getGoalGraph) so the
 * heavy store open never blocks this half.
 */
import { createServerFn } from "@tanstack/react-start";
import { buildAnatomy } from "./anatomy.repository.js";
import type { AnatomyReport } from "./anatomy.types.js";

export type { AnatomyReport } from "./anatomy.types.js";

export const getAnatomy = createServerFn()
	.inputValidator((data: { repoRoot?: string }) => data ?? {})
	.handler(
		async ({ data }): Promise<AnatomyReport> => buildAnatomy(data.repoRoot ?? process.cwd()),
	);
