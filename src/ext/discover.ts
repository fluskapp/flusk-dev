/**
 * Finding extension files, in the one order ah will ever load them.
 *
 * WHY THIS FILE EXISTS: load order is part of the contract (src/ext/types.ts).
 * Global first, then project, alphabetical within each scope — so two machines
 * with the same files behave the same, and so "the project one wins" is a rule
 * rather than an accident of readdir order (which is filesystem-dependent).
 *
 * It is also where a project's files are proven to live inside the project.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { resolveWithin } from "../safety/paths.js";
import { ahHome } from "../session/paths.js";

export interface Candidate {
	name: string;
	source: string;
	scope: "global" | "project";
	/** Set when the file was rejected before any code ran; never imported then. */
	error?: string;
}

export function globalExtensionsDir(): string {
	return join(ahHome(), "extensions");
}

export function projectExtensionsDir(repoRoot: string): string {
	return join(repoRoot, ".ah", "extensions");
}

/** Missing directory ⇒ no extensions, not an error: most repos have none. */
async function listJs(dir: string): Promise<string[]> {
	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch {
		return [];
	}
	return entries.filter((f) => f.endsWith(".js") && !f.startsWith(".")).sort();
}

/**
 * Project files are jailed to the repo with the shared path jail: a repo could
 * otherwise ship `.ah/extensions/x.js` as a symlink to somewhere else on the
 * user's disk and have ah import that. The global scope is deliberately exempt
 * — linking `~/.ah/extensions/foo.js` at a dotfiles checkout is the user's own
 * deliberate act on their own tree, which is the thing the trust boundary calls
 * trusted; a link out of a *repo* is the repo choosing what ah reads.
 */
async function scan(dir: string, scope: Candidate["scope"], jail?: string): Promise<Candidate[]> {
	const out: Candidate[] = [];
	for (const file of await listJs(dir)) {
		const name = file.slice(0, -3);
		const source = join(dir, file);
		if (jail === undefined) {
			out.push({ name, source, scope });
			continue;
		}
		try {
			resolveWithin([jail], source, dir);
			out.push({ name, source, scope });
		} catch (err) {
			out.push({ name, source, scope, error: err instanceof Error ? err.message : String(err) });
		}
	}
	return out;
}

/** Global then project; alphabetical within each scope. */
export async function discoverExtensions(repoRoot: string): Promise<Candidate[]> {
	const global = await scan(globalExtensionsDir(), "global");
	const project = await scan(projectExtensionsDir(repoRoot), "project", repoRoot);
	return [...global, ...project];
}
