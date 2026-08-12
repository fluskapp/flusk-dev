/**
 * A file-identity cache for the dashboard's scanners.
 *
 * The webview polls /api/projects every 4s and /api/runs every 5s, and each
 * of those walks every journal, every indexed document and every session
 * transcript on disk. Re-reading a file that has not changed is the whole
 * cost, so every scanner routes its per-file parse through here: the key is
 * the file's identity (path + mtime + size), and a hit skips the read.
 *
 * Nothing is invalidated by time. A file that changed gets a new stamp and is
 * re-read on the very next scan, so a live session's cost is never stale —
 * which a TTL cache could not promise.
 */
import { statSync } from "node:fs";

export interface Stamp {
	mtimeMs: number;
	size: number;
}

/** null when the file vanished between readdir and stat. */
export function stampOf(path: string): Stamp | null {
	try {
		const st = statSync(path);
		return { mtimeMs: st.mtimeMs, size: st.size };
	} catch {
		return null;
	}
}

export interface FileCache<T> {
	/** `build()` runs only when `path` is new or its stamp moved. */
	get(path: string, stamp: Stamp, build: () => T | null): T | null;
}

/**
 * `max` bounds the map so a long-lived `flusk ui` over a big tree cannot grow
 * without limit; crossing it clears the map rather than evicting cleverly —
 * the next scan simply repays one sweep.
 */
export function createFileCache<T>(max = 5000): FileCache<T> {
	const entries = new Map<string, Stamp & { value: T }>();
	return {
		get(path, stamp, build) {
			const hit = entries.get(path);
			if (hit !== undefined && hit.mtimeMs === stamp.mtimeMs && hit.size === stamp.size) {
				return hit.value;
			}
			const value = build();
			if (value === null) {
				entries.delete(path);
				return null;
			}
			if (entries.size >= max) entries.clear();
			entries.set(path, { ...stamp, value });
			return value;
		},
	};
}
