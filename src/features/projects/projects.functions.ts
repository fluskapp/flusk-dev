/**
 * The projects feature's typed server functions — what route loaders and the
 * React client call instead of the loopback JSON endpoints. Bodies delegate
 * to the same modules the legacy handlers used, so the two surfaces cannot
 * drift while both exist.
 *
 * createServerOnlyFn guards the direct engine reads: a mistaken client import
 * fails loudly at build time instead of silently bundling node internals.
 */
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { scanJournals } from "./journal-scan.repository.js";
import { buildOverview, type Overview } from "./overview.js";
import { scanProjects } from "./project-scan.repository.js";
import type { ProjectSummary } from "./projects.types.js";
import { scanArtifacts } from "./artifact-scan.repository.js";
import { scanSessions, type SessionSummary } from "./scan.repository.js";

export type { Overview } from "./overview.js";
export type { SessionSummary } from "./scan.repository.js";
export type { ProjectSummary } from "./projects.types.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** The Attention/Overview payload: stat tiles plus recent activity. */
export const getOverview = createServerFn().handler(async (): Promise<Overview> => {
	const c = cfg();
	return buildOverview(
		scanSessions(),
		scanJournals(c.ui.harnessDirs),
		scanArtifacts(c.ui.projectDirs).length,
	);
});

/** Every project the config points at, for the rail and the tree. */
export const getProjects = createServerFn().handler(async (): Promise<ProjectSummary[]> => {
	return scanProjects(cfg());
});

/** Recorded sessions, newest first — the Runs list. */
export const getSessions = createServerFn().handler(async (): Promise<SessionSummary[]> => {
	return scanSessions();
});
