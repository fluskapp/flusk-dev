/**
 * The merge as data: which layer won each config key, for the Config window's
 * resolved view. Replays loadConfig's precedence (default ← home ← project,
 * untrusted sections refused) without ever throwing — a dump must render for
 * exactly the broken file you came to debug, so a malformed layer becomes a
 * `malformed` row instead of an error page.
 */
import { join } from "node:path";
import { fluskHome } from "../paths/paths.js";
import { REPO_STRIPPED } from "./config.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import { type ConfigLayer, readLayer } from "./layer.js";
import { LEGACY_REPO_CONFIG_REL, repoConfigPath } from "./repo-layer.js";

export type Origin = "default" | "home" | "project" | "stripped";

export interface ResolvedKey {
	/** Dotted path, two levels: "budgets.maxCostUsd", "models.plan". */
	path: string;
	/** JSON value after the merge (the winner). */
	value: unknown;
	origin: Origin;
}

export interface ResolvedConfig {
	keys: ResolvedKey[];
	/** Layer files consulted: absolute path + whether present/parseable. */
	layers: Array<{ scope: "home" | "project"; path: string; state: "read" | "absent" | "malformed"; error?: string }>;
	/** FLUSK_HOME when set — the only env contribution (H0 D1). */
	envHome: string | null;
	/** Notes: deprecated .ah.json in use, unknown top-level keys per layer. */
	notes: string[];
}

type LayerRow = ResolvedConfig["layers"][number];
type Read = { layer: ConfigLayer | null; row: LayerRow };

/** Keys real configs carry that DEFAULT_CONFIG (all-defaults) does not. */
const KNOWN_EXTRAS = new Set(["namespace", "containers.context"]);

const rec = (v: unknown): Record<string, unknown> | null =>
	typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const isStripped = (path: string): boolean =>
	REPO_STRIPPED.some((p) => path === p || path.startsWith(`${p}.`));

function readAt(scope: LayerRow["scope"], path: string): Read {
	try {
		const layer = readLayer(path);
		return { layer, row: { scope, path, state: layer === null ? "absent" : "read" } };
	} catch (err) {
		const error = err instanceof Error ? err.message : String(err);
		return { layer: null, row: { scope, path, state: "malformed", error } };
	}
}

/** The project layer, with the legacy .ah.json fallback surfaced as a note. */
function readProject(repoRoot: string, notes: string[]): Read {
	const current = readAt("project", repoConfigPath(repoRoot));
	if (current.layer !== null || current.row.state === "malformed") return current;
	const legacyPath = join(repoRoot, LEGACY_REPO_CONFIG_REL);
	const legacy = readAt("project", legacyPath);
	if (legacy.layer === null && legacy.row.state === "absent") return current;
	notes.push(`${legacyPath} is deprecated and will stop being read — move it to .flusk/config.json`);
	return legacy;
}

/** Origin = last layer that supplied the key; a refused project value marks
 * the row `stripped` while the surviving (home/default) value is shown. */
function resolveKeys(home: ConfigLayer | null, project: ConfigLayer | null): ResolvedKey[] {
	const keys: ResolvedKey[] = [];
	for (const [sec, secDefault] of Object.entries(DEFAULT_CONFIG as unknown as Record<string, unknown>)) {
		const dsec = rec(secDefault);
		if (dsec === null) continue;
		const hsec = rec(rec(home)?.[sec]);
		const psec = rec(rec(project)?.[sec]);
		for (const [key, dval] of Object.entries(dsec)) {
			const path = `${sec}.${key}`;
			const pval = psec?.[key];
			const hval = hsec?.[key];
			if (pval !== undefined && !isStripped(path)) {
				keys.push({ path, value: pval, origin: "project" });
				continue;
			}
			keys.push({
				path,
				value: hval !== undefined ? hval : dval,
				origin: pval !== undefined ? "stripped" : hval !== undefined ? "home" : "default",
			});
		}
	}
	return keys;
}

/** Schema drift is visible, never fatal: unknown sections/keys become notes. */
function noteUnknown(scope: LayerRow["scope"], layer: ConfigLayer | null, notes: string[]): void {
	const l = rec(layer);
	if (l === null) return;
	const defaults = DEFAULT_CONFIG as unknown as Record<string, unknown>;
	for (const [sec, val] of Object.entries(l)) {
		if (!(sec in defaults)) {
			if (!KNOWN_EXTRAS.has(sec)) notes.push(`${scope} layer: unknown section "${sec}"`);
			continue;
		}
		const dsec = rec(defaults[sec]);
		const lsec = rec(val);
		if (dsec === null || lsec === null) continue; // e.g. the repo-form verify list
		for (const key of Object.keys(lsec)) {
			const path = `${sec}.${key}`;
			if (!(key in dsec) && !KNOWN_EXTRAS.has(path)) {
				notes.push(`${scope} layer: unknown key "${path}"`);
			}
		}
	}
}

export function resolveConfig(repoRoot: string): ResolvedConfig {
	const notes: string[] = [];
	const home = readAt("home", join(fluskHome(), "config.json"));
	const project = readProject(repoRoot, notes);
	noteUnknown("home", home.layer, notes);
	noteUnknown("project", project.layer, notes);
	return {
		keys: resolveKeys(home.layer, project.layer),
		layers: [home.row, project.row],
		envHome: process.env.FLUSK_HOME ?? null,
		notes,
	};
}
