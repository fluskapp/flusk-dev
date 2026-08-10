/**
 * Config loading: DEFAULT_CONFIG ← ~/.hit/config.json ← <repo>/.hit.json,
 * merged section-wise. Models are NOT resolved here (offline loads must
 * work); the router resolves them at use.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hitHome } from "../session/paths.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { HitConfig } from "./types.js";

/** Any config layer: sections of HitConfig, each partial. */
interface ConfigLayer {
	models?: Partial<HitConfig["models"]>;
	budgets?: Partial<HitConfig["budgets"]>;
	unattended?: Partial<HitConfig["unattended"]>;
	isolation?: Partial<HitConfig["isolation"]>;
	compaction?: Partial<HitConfig["compaction"]>;
	memory?: Partial<HitConfig["memory"]>;
	verify?: Partial<HitConfig["verify"]>;
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

function mergeLayer(base: HitConfig, layer: ConfigLayer | null): HitConfig {
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
	};
}

export function loadConfig(repoRoot: string): HitConfig {
	let cfg = structuredClone(DEFAULT_CONFIG);
	cfg = mergeLayer(cfg, readLayer(join(hitHome(), "config.json")));
	cfg = mergeLayer(cfg, readLayer(join(repoRoot, ".hit.json")));
	return cfg;
}
