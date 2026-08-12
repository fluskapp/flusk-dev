import { createHash } from "node:crypto";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

/** Root of flusk's on-disk state; overridable for tests via FLUSK_HOME. */
export function fluskHome(): string {
	return process.env.FLUSK_HOME ?? join(homedir(), ".flusk");
}

/** The pre-rename root, read only by the one-shot migration in platform/paths. */
export function legacyHome(): string {
	return join(homedir(), ".ah");
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
	return join(fluskHome(), "sessions", repoSlug(repoRoot));
}

/** "<compact-iso>-<id>.jsonl" so files sort chronologically. */
export function newSessionPath(repoRoot: string, id: string, now: Date): string {
	const compactIso = now.toISOString().replace(/[:.]/g, "-");
	return join(sessionsDir(repoRoot), `${compactIso}-${id}.jsonl`);
}
