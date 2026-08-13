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
import { fluskHome } from "../../platform/paths/paths.js";
import { version } from "../../platform/version.js";
import { scanJournals } from "./journal-scan.repository.js";
import { buildOverview, type Overview } from "./overview.js";
import { scanProjects } from "./project-scan.repository.js";
import type { ProjectSummary } from "./projects.types.js";
import { scanArtifacts } from "./artifact-scan.repository.js";
import { createSessionScanner } from "./native.repository.js";
import type { SessionSummary } from "./scan.repository.js";

const sessions = createSessionScanner();

export type { Overview } from "./overview.js";
export type { SessionSummary } from "./scan.repository.js";
export type { ProjectSummary } from "./projects.types.js";

const cfg = createServerOnlyFn(() => loadConfig(process.cwd()));

/** What the chrome itself needs: the status bar's home path and version,
 * and the toolbar's count line ("N projects · M live"). */
export interface WorkbenchMeta {
	home: string;
	version: string;
	projects: number;
	live: number;
}

export const getWorkbenchMeta = createServerFn().handler(async (): Promise<WorkbenchMeta> => {
	const all = scanProjects(cfg());
	return {
		home: fluskHome(),
		version: version(),
		projects: all.length,
		live: all.reduce((n, p) => n + p.liveRuns, 0),
	};
});

/** The Attention/Overview payload: stat tiles plus recent activity. */
export const getOverview = createServerFn().handler(async (): Promise<Overview> => {
	const c = cfg();
	return buildOverview(
		await sessions.scan(),
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
	return sessions.scan();
});
