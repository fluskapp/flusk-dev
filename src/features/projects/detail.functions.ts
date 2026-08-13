/**
 * The project-detail server function: one project in full, for the Config
 * view. Delegates to project-detail.repository.ts — the same module the
 * legacy /api/project handler called — so the two surfaces cannot drift.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { projectDetail } from "./project-detail.repository.js";
import type { ProjectDetail as Detail } from "./projects.types.js";

export type { Attention, ModelRef, ProjectSummary } from "./projects.types.js";

/**
 * The wire shape: projects.types.ts types config values as `unknown`, which
 * the server-function serializer refuses to promise about — but the config
 * is parsed from JSON files, so JSON is what the values are.
 */
export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
export type ProjectDetail = Omit<Detail, "config"> & { config: Record<string, Json> };

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** null when the config does not name a project by that name. */
export const getProjectDetail = createServerFn()
	.inputValidator((data: { name: string }) => data)
	.handler(
		async ({ data }): Promise<ProjectDetail | null> =>
			projectDetail(cfg(), data.name) as ProjectDetail | null,
	);
