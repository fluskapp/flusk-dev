/**
 * The project model — the spine of the dashboard's IA. A *project* is a
 * directory under `ui.projectDirs`: either a harness (it drives its own
 * pipeline and writes run journals) or a plain repo flusk works in. Runs,
 * sessions and documents are aggregated onto it, and each project carries
 * its attention list (see project-attention.ts) so the front page can say
 * what needs a human instead of listing everything.
 */
import { existsSync, statSync } from "node:fs";
import { summarize } from "./project-summary.js";
export { summarize } from "./project-summary.js";
import { basename, join, resolve } from "node:path";
import type { FluskConfig } from "../../platform/config/types.js";
import type { ProjectKind, ProjectSummary } from "./projects.types.js";
import { type Artifact, dropNested, resolveProjectRoots, scanArtifacts } from "./artifact-scan.repository.js";
import { type Journal, scanJournals } from "./journal-scan.repository.js";
import { computeAttention, medianSpend } from "./project-attention.js";
import { type SessionSummary, scanSessions } from "./scan.repository.js";

/**
 * Rows kept PER PROJECT, applied after grouping. A cap on the global scan
 * would let one busy harness — 290 journals of the 294 on a real machine —
 * push every other project's runs and documents out of the newest-N window
 * and silently report their counts as zero.
 */
const JOURNALS_PER_PROJECT = 400;
const DOCS_PER_PROJECT = 2000;
/** No global truncation: counts must be true before they are displayed. */
const UNCAPPED = Number.POSITIVE_INFINITY;

/** One project's raw inputs, before they are counted into a summary. */
export interface ProjectParts {
	name: string;
	path: string;
	kind: ProjectKind;
	journals: Journal[];
	sessions: SessionSummary[];
	docs: Artifact[];
}

function isDir(path: string): boolean {
	try {
		return statSync(path).isDirectory();
	} catch {
		return false;
	}
}

/** A harness drives runs: it has the bin/src/config.json shape, or journals. */
export function classifyProject(root: string): ProjectKind {
	if (isDir(join(root, "docs", "runs"))) return "harness";
	const shaped =
		isDir(join(root, "bin")) && isDir(join(root, "src")) && existsSync(join(root, "config.json"));
	return shaped ? "harness" : "repo";
}

/**
 * Existing, de-duplicated, absolute project roots the config points at —
 * never one inside another (see artifact-scan.ts `dropNested`).
 */
export function projectRoots(cfg: FluskConfig): string[] {
	const existing = resolveProjectRoots(cfg.ui.projectDirs)
		.map((root) => resolve(root))
		.filter(isDir);
	return dropNested(existing);
}

/**
 * Scans each source once, then groups by project.
 *
 * The join key is the absolute root path, never the directory basename:
 * `~/projects/foo` and `~/projects/playground/foo` are different projects
 * that share a name, and matching on the name pours each one's journals,
 * documents and attention items into the other.
 */
export function collectParts(cfg: FluskConfig): ProjectParts[] {
	const journals = scanJournals(cfg.ui.harnessDirs);
	const sessions = scanSessions();
	const docs = scanArtifacts(cfg.ui.projectDirs, UNCAPPED);
	return projectRoots(cfg).map((path) => ({
		name: basename(path) || path,
		path,
		kind: classifyProject(path),
		journals: journals.filter((j) => j.harnessRoot === path).slice(0, JOURNALS_PER_PROJECT),
		sessions: sessions.filter((s) => resolve(s.repoRoot) === path),
		docs: docs.filter((d) => d.root === path).slice(0, DOCS_PER_PROJECT),
	}));
}

/**
 * Everything this project is known to have cost. flusk sessions record it
 * directly; a harness journal contributes only when it declares a `cost:`
 * frontmatter key, so a harness that records none reads as $0 — which
 * client-project.ts labels rather than presenting as "this was free".
 */
export const projectSpend = (p: ProjectParts): number =>
	p.sessions.reduce((sum, s) => sum + s.costUsd, 0) +
	p.journals.reduce((sum, j) => sum + (j.costUsd ?? 0), 0);

export const liveRuns = (p: ProjectParts): number =>
	p.journals.filter((j) => j.status === "running").length +
	p.sessions.filter((s) => s.status === "running").length;

/** Newest timestamp across journals, sessions and documents. */
export function lastActivity(p: ProjectParts): string | undefined {
	const iso = (ms: number): string => new Date(ms).toISOString();
	return [
		...p.journals.map((j) => j.date),
		...p.sessions.map((s) => iso(s.updatedAtMs)),
		...p.docs.map((d) => iso(d.mtimeMs)),
	]
		.filter((s) => s !== "")
		.sort()
		.at(-1);
}

export function scanProjects(cfg: FluskConfig, now: Date = new Date()): ProjectSummary[] {
	const parts = collectParts(cfg);
	const median = medianSpend(parts.map(projectSpend));
	return parts
		.map((p) => summarize(p, now.getTime(), median))
		.sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));
}
