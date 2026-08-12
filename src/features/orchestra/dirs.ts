/**
 * Where spec files live, and which jail each directory is proven against.
 *
 * One place, because the scanner and the writer must agree: a spec created
 * under `<repo>/.flusk/agents/` has to be found by the very next reload, and a
 * second opinion about that path is how a "generated agent" quietly vanishes.
 *
 * The `roots` here are what src/safety/paths.ts checks every entry against, so
 * a symlink dropped in a repo's agents directory cannot make flusk read a file
 * from outside the repo (or outside the flusk home) and label it project-scoped.
 */
import { join } from "node:path";
import { fluskHome } from "../../platform/paths/paths.js";
import type { AgentScope } from "./types.js";

export interface AgentDir {
	scope: AgentScope;
	dir: string;
	/** The jail every file found in `dir` must resolve inside of. */
	roots: string[];
}

/** `<repo>/.flusk/agents` — where dynamically created specs are written. */
export function projectAgentsDir(repoRoot: string): string {
	return join(repoRoot, ".flusk", "agents");
}

/**
 * Scan order: the user's own agents, then flusk's own generated ones, then the
 * repository's. This is the ORDER files are read (and issues reported) — it
 * is not precedence: a name collision is settled by trust in
 * spec-precedence.ts, so a cloned repo can never take a name over.
 *
 * `<home>/agents` is scanned non-recursively, which is what keeps its
 * `generated/` subdirectory from being counted twice under the wrong scope.
 */
export function agentDirs(repoRoot: string, home: string = fluskHome()): AgentDir[] {
	return [
		{ scope: "global", dir: join(home, "agents"), roots: [home] },
		{ scope: "generated", dir: join(home, "agents", "generated"), roots: [home] },
		{ scope: "project", dir: projectAgentsDir(repoRoot), roots: [repoRoot] },
	];
}
