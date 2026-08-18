/**
 * Single-journal lookup and true counts — the two reads scanJournals' per-dir
 * feed cap must never distort. A journal past the cap (a stale tab, an old
 * link, project history) is still a real file in a configured directory: it
 * has to render, reveal and count, even while the feed omits it.
 */
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
	expandHome,
	type Journal,
	journalFiles,
	journalFrom,
	resolveJournalDirs,
} from "./journal-scan.repository.js";

/**
 * Lookup by DIRECTORY CONTAINMENT, not index membership. The symlink escape
 * the membership rule guarded (content.router.ts) stays defeated: the target's
 * realpath must sit DIRECTLY inside a configured journal directory's realpath,
 * so a link under docs/runs that resolves elsewhere is still refused.
 */
export function journalAt(patterns: string[], target: string): Journal | null {
	if (target === "" || !target.endsWith(".md")) return null;
	const path = resolve(expandHome(target));
	let real: string;
	try {
		real = realpathSync(path);
	} catch {
		return null; // no such file
	}
	for (const dir of resolveJournalDirs(patterns)) {
		let realDir: string;
		try {
			realDir = realpathSync(dir);
		} catch {
			continue;
		}
		// Realpaths decide CONTAINMENT only; the returned journal keeps the
		// caller's resolved path and the configured dir's harness root — the
		// same identities scanJournals emits, so the two reads agree.
		if (dirname(real) === realDir) return journalFrom(path, resolve(dir, "..", ".."));
	}
	return null;
}

/** True journal count per harness root — readdir length, never the capped
 * slice: counts must be true before they are displayed (project-scan's rule). */
export function countJournals(patterns: string[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const dir of resolveJournalDirs(patterns)) {
		const n = journalFiles(dir).length;
		if (n === 0) continue;
		const root = resolve(dir, "..", "..");
		counts.set(root, (counts.get(root) ?? 0) + n);
	}
	return counts;
}
