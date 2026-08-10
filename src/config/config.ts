/**
 * Config loading: DEFAULT_CONFIG ← ~/.ah/config.json ← <repo>/.ah.json,
 * merged section-wise. Models are NOT resolved here (offline loads must
 * work); the router resolves them at use.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ahHome } from "../session/paths.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { AhConfig, RepoConfig } from "./types.js";

/** Any config layer: sections of AhConfig, each partial. */
interface ConfigLayer {
	models?: Partial<AhConfig["models"]>;
	budgets?: Partial<AhConfig["budgets"]>;
	unattended?: Partial<AhConfig["unattended"]>;
	isolation?: Partial<AhConfig["isolation"]>;
	compaction?: Partial<AhConfig["compaction"]>;
	memory?: Partial<AhConfig["memory"]>;
	verify?: Partial<AhConfig["verify"]>;
	watch?: Partial<AhConfig["watch"]>;
}

function readLayer(path: string): ConfigLayer | null {
	let raw: string;
	try {
		raw = readFileSync(path, "utf8");
	} catch {
		return null;
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		const detail = err instanceof Error ? err.message : String(err);
		throw new Error(`Malformed JSON in ${path}: ${detail}`);
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new Error(`Malformed config in ${path}: expected a JSON object`);
	}
	return parsed as ConfigLayer;
}

function mergeLayer(base: AhConfig, layer: ConfigLayer | null): AhConfig {
	if (!layer) return base;
	return {
		models: { ...base.models, ...layer.models },
		budgets: { ...base.budgets, ...layer.budgets },
		unattended: { ...base.unattended, ...layer.unattended },
		isolation: { ...base.isolation, ...layer.isolation },
		compaction: { ...base.compaction, ...layer.compaction },
		memory: {
			...base.memory,
			...layer.memory,
			budgets: { ...base.memory.budgets, ...layer.memory?.budgets },
		},
		verify: { ...base.verify, ...layer.verify },
		watch: { ...base.watch, ...layer.watch },
	};
}

/**
 * The RepoConfig view of <repo>/.ah.json: the fields loadConfig ignores
 * (verify[] command list, namespace override). undefined when absent.
 */
export function loadRepoConfig(repoRoot: string): RepoConfig | undefined {
	const layer = readLayer(join(repoRoot, ".ah.json"));
	return layer === null ? undefined : (layer as unknown as RepoConfig);
}

export function loadConfig(repoRoot: string): AhConfig {
	let cfg = structuredClone(DEFAULT_CONFIG);
	cfg = mergeLayer(cfg, readLayer(join(ahHome(), "config.json")));
	cfg = mergeLayer(cfg, readLayer(join(repoRoot, ".ah.json")));
	return cfg;
}
