/**
 * The resume record: what has already been indexed, and at what commit.
 *
 * Without this, opening the workbench means re-walking every source file
 * through a language service and every commit through git — seconds on a large
 * repo, on the UI's critical path, for a graph that is almost entirely
 * unchanged. With it a build costs the files whose stamp moved and the commits
 * newer than the recorded HEAD.
 *
 * RESUMABLE, not merely incremental. A build indexes a bounded SLICE of the
 * dirty files and records only the ones it actually finished, so an
 * interrupted or budget-capped build leaves the rest looking dirty and the
 * next call picks them up. A record written optimistically — "we intended to
 * index these" — would leave holes nothing ever fills.
 *
 * The stamp is `<mtimeMs>:<size>`, the same fingerprint ts-host.ts uses for
 * script versions, so the graph and the language service agree on what
 * "changed" means. It can miss an edit that keeps the size and lands inside
 * the same millisecond; that is the known cost of not hashing every file.
 */
import { readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { absPath, type Ids, relPath } from "./ids.js";

/** Bump when the record's shape changes; an older one is then treated as absent. */
export const RESUME_VERSION = 1;

/** Beyond this the oldest shas are dropped: git only ever re-offers recent ones. */
const MAX_COMMITS = 5000;

export interface GraphResume {
	version: number;
	root: string;
	project: string;
	/** HEAD when history was last folded in; null when it never has been. */
	head: string | null;
	/** Repo-relative path → stamp, for files whose structure IS indexed. */
	files: Record<string, string>;
	/** Full shas already folded into `touched_by` and `changed_with`. */
	commits: string[];
	builtAt: string;
}

export function emptyResume(ids: Ids): GraphResume {
	return {
		version: RESUME_VERSION,
		root: ids.root,
		project: ids.project,
		head: null,
		files: {},
		commits: [],
		builtAt: "",
	};
}

/** `<mtimeMs>:<size>`; "0" for anything unreadable, which reads as "changed". */
export function stampOf(path: string): string {
	try {
		const s = statSync(path);
		return `${s.mtimeMs}:${s.size}`;
	} catch {
		return "0";
	}
}

/**
 * The record, or a fresh one. A record from another root (two projects can
 * share a basename), an older version, or a corrupt file all rebuild from
 * scratch — a resume record that can lie is worse than none.
 */
export function loadResume(path: string, ids: Ids): GraphResume {
	try {
		const v = JSON.parse(readFileSync(path, "utf8")) as Partial<GraphResume>;
		if (v.version !== RESUME_VERSION || v.root !== ids.root) return emptyResume(ids);
		return {
			version: RESUME_VERSION,
			root: ids.root,
			project: ids.project,
			head: typeof v.head === "string" ? v.head : null,
			files: typeof v.files === "object" && v.files !== null ? v.files : {},
			commits: Array.isArray(v.commits) ? v.commits : [],
			builtAt: typeof v.builtAt === "string" ? v.builtAt : "",
		};
	} catch {
		return emptyResume(ids);
	}
}

/** Atomic enough: a torn write leaves the previous record, which re-indexes less. */
export function saveResume(path: string, resume: GraphResume): void {
	const trimmed: GraphResume = {
		...resume,
		commits: resume.commits.slice(-MAX_COMMITS),
	};
	const tmp = `${path}.tmp`;
	writeFileSync(tmp, JSON.stringify(trimmed));
	renameSync(tmp, path);
}

export interface FileDiff {
	/** Absolute paths whose stamp moved or that were never indexed. */
	changed: string[];
	/** Repo-relative paths the record knows and the scan no longer sees. */
	removed: string[];
	/** Fresh stamps for everything the scan saw, by relative path. */
	stamps: Map<string, string>;
}

/** What moved since the record was written. `files` is absolute, from the scan. */
export function diffFiles(resume: GraphResume, ids: Ids, files: string[]): FileDiff {
	const diff: FileDiff = { changed: [], removed: [], stamps: new Map() };
	const present = new Set<string>();
	for (const file of files) {
		const rel = relPath(ids, file);
		if (rel === null) continue;
		present.add(rel);
		const stamp = stampOf(file);
		diff.stamps.set(rel, stamp);
		if (resume.files[rel] !== stamp) diff.changed.push(absPath(ids, rel));
	}
	for (const rel of Object.keys(resume.files)) if (!present.has(rel)) diff.removed.push(rel);
	return diff;
}
