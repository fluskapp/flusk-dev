/**
 * Project markdown — the context files, plans, docs and skills flusk works from.
 * The dashboard lists them beside the run journals so a watch autopilot can be
 * read against the writing that drives it.
 *
 * Scanning is deliberately shallow and forgiving: a project that is missing,
 * unreadable or huge costs the view nothing, it just contributes no rows.
 */
import { type Dirent, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { type ArtifactKind, classifyArtifact, SKIP_DIRS } from "./artifact-kind.js";
import { artifactTitle, parseScalarFrontmatter, readHead } from "./artifact-meta.repository.js";
import { expandHome } from "./journal-scan.repository.js";
import { createFileCache, stampOf } from "./scan-cache.repository.js";

export type { ArtifactKind } from "./artifact-kind.js";

export interface Artifact {
	path: string; // absolute
	/** Absolute project root it was found under — the join key. */
	root: string;
	project: string; // project directory name it belongs to (display only)
	kind: ArtifactKind;
	title: string; // frontmatter title, else first `# heading`, else filename
	mtimeMs: number;
	bytes: number;
	frontmatter: Record<string, string>; // scalar keys only; {} when absent
}

/** Directory levels below the project root that are still walked. */
const MAX_DEPTH = 4;

/**
 * Drops any root that contains another root. The shipped defaults expand to
 * both `~/projects/*` and `~/projects/playground/*`, which makes
 * `~/projects/playground` a *container*: keeping it would publish a phantom
 * project whose documents are also indexed under each real child, so the
 * front-page document count double-counts and a bogus row appears in the
 * tree. The most specific root wins; the container is not a project.
 */
export function dropNested(roots: string[]): string[] {
	const unique = [...new Set(roots.map((r) => resolve(r)))];
	return unique.filter((r) => !unique.some((other) => other !== r && other.startsWith(`${r}/`)));
}

/**
 * Project roots. A pattern's single `*` is expanded one level, so
 * "~/projects/*<!---->" is every project directory under ~/projects.
 * Resolved, de-duplicated, and never nested inside one another.
 */
export function resolveProjectRoots(globs: string[]): string[] {
	const roots: string[] = [];
	for (const glob of globs) {
		const full = expandHome(glob);
		const star = full.indexOf("*");
		if (star === -1) {
			roots.push(full);
			continue;
		}
		const parent = dirname(full.slice(0, star + 1));
		const slash = full.indexOf("/", star);
		const suffix = slash === -1 ? "" : full.slice(slash + 1);
		let entries: Dirent[] = [];
		try {
			entries = readdirSync(parent, { withFileTypes: true });
		} catch {
			continue; // a configured parent that does not exist is normal
		}
		for (const e of entries) {
			if (e.isDirectory())
				roots.push(suffix === "" ? join(parent, e.name) : join(parent, e.name, suffix));
		}
	}
	return dropNested(roots);
}

function walk(dir: string, rel: string, depth: number, out: string[]): void {
	let entries: Dirent[] = [];
	try {
		entries = readdirSync(dir, { withFileTypes: true });
	} catch {
		return; // unreadable directory — skip it rather than fail the view
	}
	for (const e of entries) {
		const childRel = rel === "" ? e.name : `${rel}/${e.name}`;
		if (e.isDirectory()) {
			if (SKIP_DIRS.has(e.name) || childRel === "docs/runs") continue;
			if (depth < MAX_DEPTH) walk(join(dir, e.name), childRel, depth + 1, out);
		} else if (e.isFile() && e.name.endsWith(".md")) out.push(childRel);
	}
}

/** Head-parsed metadata per file identity; a poll re-reads only what changed. */
const cache = createFileCache<Artifact>();

export function scanArtifacts(projectGlobs: string[], limit = 400): Artifact[] {
	const out: Artifact[] = [];
	for (const root of resolveProjectRoots(projectGlobs)) {
		const rels: string[] = [];
		walk(root, "", 0, rels);
		const project = basename(root) || root;
		for (const rel of rels) {
			const kind = classifyArtifact(rel);
			if (kind === null) continue;
			const path = join(root, ...rel.split("/"));
			const stamp = stampOf(path);
			if (stamp === null) continue; // vanished between readdir and stat
			const artifact = cache.get(path, stamp, () => {
				const head = readHead(path);
				const frontmatter = parseScalarFrontmatter(head);
				return {
					path,
					root,
					project,
					kind,
					title: artifactTitle(path, head, frontmatter),
					mtimeMs: stamp.mtimeMs,
					bytes: stamp.size,
					frontmatter,
				};
			});
			if (artifact) out.push(artifact);
		}
	}
	return out.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, Math.max(0, limit));
}
