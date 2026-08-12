/**
 * Which projects are allowed to run their own extension code.
 *
 * WHY THIS FILE EXISTS: `<repo>/.flusk/extensions/*.js` is arbitrary JavaScript
 * that ships inside whatever repository happens to be on disk. Importing it
 * because the user cd'd into a fresh clone is remote code execution with the
 * user's own filesystem, keys and network. src/config/config.ts already draws
 * exactly this line for config layers — `~/.flusk/…` is the user's own file and is
 * trusted, `<repo>/.flusk/config.json` is authored by whoever wrote the repo and is not —
 * and the same line has to hold here, harder: a config layer is data, an
 * extension is code.
 *
 * So trust lives ONLY in the user layer: `<flusk home>/trusted-projects.json`, a
 * JSON array of absolute repo roots. There is deliberately NO repo-side key
 * that grants this; a repo can never vouch for itself, because the thing we are
 * defending against is precisely a repo that says "I'm fine, run me".
 *
 * Without this file the loader would happily import a cloned repo's JS.
 */
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fluskHome } from "../session/paths.js";

/** The user-owned file listing repo roots whose extensions may load. */
export function trustFilePath(): string {
	return join(fluskHome(), "trusted-projects.json");
}

/**
 * Symlinks are resolved on both sides so `/tmp/x` and `/private/tmp/x` are the
 * same project. A path that does not exist keeps its resolved form: a stale
 * entry must not become a wildcard.
 */
function canonical(path: string): string {
	const abs = resolve(path);
	try {
		return realpathSync(abs);
	} catch {
		return abs;
	}
}

/** Absent, unreadable or malformed file ⇒ nothing is trusted. Never throws. */
export function trustedProjects(): string[] {
	let raw: string;
	try {
		raw = readFileSync(trustFilePath(), "utf8");
	} catch {
		return [];
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];
	return parsed.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

export function isProjectTrusted(repoRoot: string): boolean {
	const target = canonical(repoRoot);
	return trustedProjects().some((entry) => canonical(entry) === target);
}

/** The sentence flusk shows instead of silently loading nothing. */
export function untrustedReason(repoRoot: string): string {
	return (
		`project extensions are not loaded: "${resolve(repoRoot)}" is not listed in ` +
		`${trustFilePath()}. A project extension is arbitrary code, so it runs only ` +
		`for projects you have vouched for.`
	);
}
