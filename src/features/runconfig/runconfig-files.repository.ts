/**
 * The config files on disk — `.flusk/runs/<name>.json`, read and written
 * nowhere else. Two directories, the workspace-layer precedent: the project
 * dir shadows `~/.flusk/runs` by name. Scanning refuses per FILE, never per
 * directory: one unreadable config lands in `skipped` with its reason while
 * the rest keep listing.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fluskHome } from "../../platform/paths/paths.js";
import { validSpecName } from "../specs/spec-files.repository.js";
import { parseRunConfigText } from "./runconfig-parse.js";
import {
	RUN_DIR,
	type RunConfig,
	type RunConfigMeta,
	type RunConfigScan,
	type RunConfigScope,
} from "./runconfig.types.js";

export const globalRunDir = (): string => join(fluskHome(), "runs");
export const projectRunDir = (repoRoot: string): string => join(repoRoot, RUN_DIR);

/** A name is a file stem — a handle, never a path (the spec-name rule). */
export const validConfigName = validSpecName;

const dirOf = (repoRoot: string, scope: RunConfigScope): string =>
	scope === "project" ? projectRunDir(repoRoot) : globalRunDir();

/** Project: repo-relative (committable). Global: absolute (no repo to be relative to). */
const pathOf = (repoRoot: string, name: string, scope: RunConfigScope): string =>
	scope === "project" ? `${RUN_DIR}/${name}.json` : join(globalRunDir(), `${name}.json`);

export type RunConfigOpen =
	| { ok: true; meta: RunConfigMeta }
	| { ok: false; missing?: boolean; why: string };

export function openRunConfig(repoRoot: string, name: string, scope: RunConfigScope): RunConfigOpen {
	if (!validConfigName(name)) return { ok: false, why: `"${name}" is not a valid config name` };
	let text: string;
	try {
		text = readFileSync(join(dirOf(repoRoot, scope), `${name}.json`), "utf8");
	} catch (e) {
		const err = e as NodeJS.ErrnoException;
		return { ok: false, missing: err.code === "ENOENT", why: err.message };
	}
	const parsed = parseRunConfigText(text);
	if (!parsed.ok) return parsed;
	return { ok: true, meta: { ...parsed.config, name, scope, path: pathOf(repoRoot, name, scope) } };
}

/**
 * The config this name resolves to — project first, the shadowing rule. A
 * BROKEN project file refuses the name rather than falling through: silently
 * running the global config would launch something the dialog never showed.
 */
export function readRunConfig(repoRoot: string, name: string): RunConfigOpen {
	const project = openRunConfig(repoRoot, name, "project");
	if (project.ok || project.missing !== true) return project;
	return openRunConfig(repoRoot, name, "global");
}

const listDir = (dir: string): string[] => {
	try {
		return readdirSync(dir)
			.filter((f) => f.endsWith(".json"))
			.sort();
	} catch {
		return []; // a repo without run configs is normal, not an error
	}
};

/** Every config the repo can launch, name order; the unreadable ones say why. */
export function scanRunConfigs(repoRoot: string): RunConfigScan {
	const configs = new Map<string, RunConfigMeta>();
	const skipped: RunConfigScan["skipped"] = [];
	for (const scope of ["global", "project"] as const) {
		for (const file of listDir(dirOf(repoRoot, scope))) {
			const name = file.slice(0, -".json".length);
			const opened = openRunConfig(repoRoot, name, scope);
			if (opened.ok) configs.set(name, opened.meta); // the project pass overwrites global
			else skipped.push({ path: pathOf(repoRoot, name, scope), why: opened.why });
		}
	}
	return {
		configs: [...configs.values()].sort((a, b) => a.name.localeCompare(b.name)),
		skipped,
	};
}

/** Writes (or overwrites — Save edits) the file, pretty-printed for diffing. */
export function saveRunConfigFile(
	repoRoot: string,
	name: string,
	config: RunConfig,
	scope: RunConfigScope,
): string {
	if (!validConfigName(name)) {
		throw new Error(`config name "${name}" — letters, digits, dot, dash and underscore only`);
	}
	const dir = dirOf(repoRoot, scope);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `${name}.json`), `${JSON.stringify(config, null, "\t")}\n`);
	return pathOf(repoRoot, name, scope);
}

export function deleteRunConfigFile(repoRoot: string, name: string, scope: RunConfigScope): boolean {
	if (!validConfigName(name)) return false;
	try {
		rmSync(join(dirOf(repoRoot, scope), `${name}.json`));
		return true;
	} catch {
		return false;
	}
}
