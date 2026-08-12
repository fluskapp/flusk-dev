/**
 * Harness run journals — the markdown files other harnesses (linof-harness,
 * ab) write per run under `docs/runs/`. flusk reads them so a watch autopilot can
 * be followed live from one dashboard, which is what aihub used to do.
 *
 * A journal carries its harness ROOT, not just the directory basename: two
 * configured roots can share a name (`~/projects/foo` and
 * `~/projects/playground/foo` both), and joining on the name would pour each
 * one's runs into the other.
 */
import { readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { type JournalMeta, type JournalStage, parseFrontmatter } from "./journal-frontmatter.js";
import { createFileCache, stampOf } from "./scan-cache.repository.js";

export type { JournalStage, JournalMeta } from "./journal-frontmatter.js";
export { parseFrontmatter } from "./journal-frontmatter.js";

/**
 * Journals taken from EACH harness directory, newest filename first.
 *
 * The cap is per directory, never global: one harness with 290 journals must
 * not be able to push every other harness's runs out of the result, which is
 * what a global newest-N slice does. Callers that need a bounded response
 * slice the sorted list themselves.
 */
const JOURNAL_LIMIT = 400;

export interface Journal extends JournalMeta {
	/** Absolute path — the handle the UI passes back. */
	path: string;
	/** Basename of the harness root; kept for display, never for joining. */
	harness: string;
	/** Absolute harness root (the parent of `docs/runs`) — the join key. */
	harnessRoot: string;
	/** Last write to the file: what "is this run still moving?" means. */
	mtimeMs: number;
}

/** `~` expansion only — these come from config, not from a request. */
export function expandHome(p: string): string {
	return p.startsWith("~/") ? join(homedir(), p.slice(2)) : p;
}

/**
 * Directories to scan. A pattern's single `*` is expanded one level, so
 * "~/projects/*<!---->/docs/runs" finds every project's journal directory.
 */
export function resolveJournalDirs(patterns: string[]): string[] {
	const dirs: string[] = [];
	for (const pattern of patterns) {
		const full = expandHome(pattern);
		const star = full.indexOf("*");
		if (star === -1) {
			dirs.push(full);
			continue;
		}
		const parent = dirname(full.slice(0, star + 1));
		const suffix = full.slice(full.indexOf("/", star) + 1);
		let entries: string[] = [];
		try {
			entries = readdirSync(parent);
		} catch {
			continue;
		}
		for (const e of entries) dirs.push(join(parent, e, suffix));
	}
	return dirs;
}

/** Parsed frontmatter per file identity: a poll re-reads only what changed. */
const cache = createFileCache<JournalMeta>();

export function scanJournals(patterns: string[], perDirLimit = JOURNAL_LIMIT): Journal[] {
	const out: Journal[] = [];
	for (const dir of resolveJournalDirs(patterns)) {
		let files: string[] = [];
		try {
			files = readdirSync(dir).filter((f) => f.endsWith(".md"));
		} catch {
			continue; // a project without journals is normal, not an error
		}
		const harnessRoot = resolve(dir, "..", "..");
		const harness = basename(harnessRoot);
		for (const f of files.sort().reverse().slice(0, perDirLimit)) {
			const path = join(dir, f);
			const stamp = stampOf(path);
			if (stamp === null) continue;
			const meta = cache.get(path, stamp, () => readMeta(path));
			if (meta === null) continue;
			out.push({
				path,
				harness,
				harnessRoot,
				mtimeMs: stamp.mtimeMs,
				...meta,
				date: meta.date || new Date(stamp.mtimeMs).toISOString(),
			});
		}
	}
	return out.sort((a, b) => b.date.localeCompare(a.date));
}

function readMeta(path: string): JournalMeta | null {
	try {
		return parseFrontmatter(readFileSync(path, "utf8").slice(0, 8000));
	} catch {
		return null; // unreadable journal — skip it rather than fail the view
	}
}
