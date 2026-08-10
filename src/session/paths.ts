import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

/** Root of hit's on-disk state; overridable for tests via HIT_HOME. */
export function hitHome(): string {
	return process.env.HIT_HOME ?? join(homedir(), ".hit");
}

/**
 * Human-readable, collision-safe directory name for a repo:
 * lowercase basename (non-alphanumerics collapsed to "-") plus the first
 * 8 hex chars of the sha256 of the absolute path.
 */
export function repoSlug(repoRoot: string): string {
	const abs = resolve(repoRoot);
	const name = basename(abs)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	const hash = createHash("sha256").update(abs).digest("hex").slice(0, 8);
	return `${name}-${hash}`;
}

export function sessionsDir(repoRoot: string): string {
	return join(hitHome(), "sessions", repoSlug(repoRoot));
}

/** "<compact-iso>-<id>.jsonl" so files sort chronologically. */
export function newSessionPath(repoRoot: string, id: string, now: Date): string {
	const compactIso = now.toISOString().replace(/[:.]/g, "-");
	return join(sessionsDir(repoRoot), `${compactIso}-${id}.jsonl`);
}
