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
import { countJournals } from "./journal-lookup.repository.js";
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

/** What the chrome itself needs: the status bar's home path, version and
 * counts ("N projects · M live" live in the STATUS bar only), and the
 * Projects rail's rows — the scan already ran, so the tree SSRs populated
 * instead of shipping a "Scanning projects…" placeholder on every first
 * paint. `version` is absent when it cannot be resolved: the status bar
 * omits its widget rather than print a sentinel. */
export interface WorkbenchMeta {
	home: string;
	version?: string;
	projects: number;
	live: number;
	list: ProjectSummary[];
}

export const getWorkbenchMeta = createServerFn().handler(async (): Promise<WorkbenchMeta> => {
	const all = scanProjects(cfg());
	const v = version();
	return {
		home: fluskHome(),
		...(v !== undefined ? { version: v } : {}),
		// The project-less group (path "") holds real work but is not a
		// configured project; it counts toward "live" — the same population the
		// Overview's "running" tile counts — never toward "N projects".
		// "live" is a CONTRACT with the list it links to: sessions and journals
		// whose files are still being written (features/run/liveness.ts), which
		// is exactly what /runs puts in its Live section. Flow runs are not in
		// it, here or there, so the chip and the section cannot disagree.
		projects: all.filter((p) => p.path !== "").length,
		live: all.reduce((n, p) => n + p.liveRuns, 0),
		list: all,
	};
});

/** The Attention/Overview payload: stat tiles plus recent activity. */
export const getOverview = createServerFn().handler(async (): Promise<Overview> => {
	const c = cfg();
	return buildOverview(
		await sessions.scan(),
		scanJournals(c.ui.harnessDirs),
		scanArtifacts(c.ui.projectDirs).length,
		countJournals(c.ui.harnessDirs),
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
