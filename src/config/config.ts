/**
 * Config loading: DEFAULT_CONFIG ← ~/.ah/config.json ← <repo>/.ah.json,
 * merged section-wise. Models are NOT resolved here (offline loads must
 * work); the router resolves them at use.
 *
 * The two layers are NOT equally trusted. `~/.ah/config.json` is the user's
 * own file; `<repo>/.ah.json` ships inside whatever repository happens to be
 * on disk, so a cloned repo authors it. Two sections are therefore refused
 * from the repo layer entirely:
 *
 *  - `memory` transport (baseUrl/apiKey/autoSpawn/serverBin/dataDir). A repo
 *    that could set `baseUrl` while inheriting the global `apiKey` would make
 *    the dashboard send that key as `Authorization: Bearer` to a host of the
 *    repo's choosing.
 *  - `chat.backends`. `ah ui` loads config from its own cwd and spawns what
 *    that list names, so a repo could otherwise choose the binary a click on
 *    Send executes.
 *  - `ui.projectDirs` / `ui.harnessDirs`. These are the directories the
 *    history indexer reads, serves over /api/history/search and embeds into
 *    composed prompts, so a repo could otherwise choose whose files leave the
 *    machine.
 *
 * Everything else (budgets, models, verify, isolation…) stays per-repo: those
 * only steer a run the user has already asked for in that repo.
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
	ui?: Partial<AhConfig["ui"]>;
	chat?: Partial<AhConfig["chat"]>;
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

/** Memory keys only the user's own ~/.ah/config.json may set. */
const HOME_ONLY_MEMORY = ["baseUrl", "apiKey", "autoSpawn", "serverBin", "dataDir"] as const;

/**
 * Scan roots only the user's own ~/.ah/config.json may set. These name the
 * directories the history indexer READS and then serves over the loopback API
 * and embeds into composed prompts; a cloned repo that could point them at
 * `~/clients` would have `ah ui` publish the head of every .md under it.
 */
const HOME_ONLY_UI = ["projectDirs", "harnessDirs"] as const;

/** The `ui` section a layer is allowed to contribute. */
function uiOf(layer: ConfigLayer, trusted: boolean): Partial<AhConfig["ui"]> {
	if (layer.ui === undefined) return {};
	if (trusted) return layer.ui;
	const out: Partial<AhConfig["ui"]> = { ...layer.ui };
	for (const key of HOME_ONLY_UI) delete out[key];
	return out;
}

/** The `memory` section a layer is allowed to contribute. */
function memoryOf(layer: ConfigLayer, trusted: boolean): Partial<AhConfig["memory"]> {
	const mem = layer.memory;
	if (mem === undefined) return {};
	if (trusted) return mem;
	const out: Partial<AhConfig["memory"]> = { ...mem };
	for (const key of HOME_ONLY_MEMORY) delete out[key];
	return out;
}

/** The `chat` section a layer is allowed to contribute. */
function chatOf(layer: ConfigLayer, trusted: boolean): Partial<AhConfig["chat"]> {
	if (layer.chat === undefined) return {};
	if (trusted) return layer.chat;
	const { backends: _dropped, ...rest } = layer.chat;
	return rest;
}

function mergeLayer(base: AhConfig, layer: ConfigLayer | null, trusted: boolean): AhConfig {
	if (!layer) return base;
	return {
		models: { ...base.models, ...layer.models },
		budgets: { ...base.budgets, ...layer.budgets },
		unattended: { ...base.unattended, ...layer.unattended },
		isolation: { ...base.isolation, ...layer.isolation },
		compaction: { ...base.compaction, ...layer.compaction },
		memory: {
			...base.memory,
			...memoryOf(layer, trusted),
			budgets: { ...base.memory.budgets, ...layer.memory?.budgets },
		},
		verify: { ...base.verify, ...layer.verify },
		ui: { ...base.ui, ...uiOf(layer, trusted) },
		chat: { ...base.chat, ...chatOf(layer, trusted) },
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
	cfg = mergeLayer(cfg, readLayer(join(ahHome(), "config.json")), true);
	cfg = mergeLayer(cfg, readLayer(join(repoRoot, ".ah.json")), false);
	return cfg;
}
