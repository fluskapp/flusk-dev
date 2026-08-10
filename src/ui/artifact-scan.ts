/**
 * Project markdown — the context files, plans, docs and skills ah works from.
 * The dashboard lists them beside the run journals so a watch autopilot can be
 * read against the writing that drives it.
 *
 * Scanning is deliberately shallow and forgiving: a project that is missing,
 * unreadable or huge costs the view nothing, it just contributes no rows.
 */
import { type Dirent, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { type ArtifactKind, classifyArtifact, SKIP_DIRS } from "./artifact-kind.js";
import { artifactTitle, parseScalarFrontmatter, readHead } from "./artifact-meta.js";
import { expandHome } from "./journal-scan.js";

export type { ArtifactKind } from "./artifact-kind.js";

export interface Artifact {
	path: string; // absolute
	project: string; // project directory name it belongs to
	kind: ArtifactKind;
	title: string; // frontmatter title, else first `# heading`, else filename
	mtimeMs: number;
	bytes: number;
	frontmatter: Record<string, string>; // scalar keys only; {} when absent
}

/** Directory levels below the project root that are still walked. */
const MAX_DEPTH = 4;

/**
 * Project roots. A pattern's single `*` is expanded one level, so
 * "~/projects/*<!---->" is every project directory under ~/projects.
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
	return roots;
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

function toArtifact(root: string, project: string, rel: string): Artifact | null {
	const kind = classifyArtifact(rel);
	if (kind === null) return null;
	const path = join(root, ...rel.split("/"));
	try {
		const head = readHead(path);
		const frontmatter = parseScalarFrontmatter(head);
		const st = statSync(path);
		return {
			path,
			project,
			kind,
			title: artifactTitle(path, head, frontmatter),
			mtimeMs: st.mtimeMs,
			bytes: st.size,
			frontmatter,
		};
	} catch {
		return null; // vanished or unreadable between readdir and stat
	}
}

export function scanArtifacts(projectGlobs: string[], limit = 400): Artifact[] {
	const out: Artifact[] = [];
	for (const root of resolveProjectRoots(projectGlobs)) {
		const rels: string[] = [];
		walk(root, "", 0, rels);
		const project = basename(root) || root;
		for (const rel of rels) {
			const artifact = toArtifact(root, project, rel);
			if (artifact) out.push(artifact);
		}
	}
	return out.sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, Math.max(0, limit));
}
