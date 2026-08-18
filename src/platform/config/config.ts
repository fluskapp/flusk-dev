/**
 * Config loading: DEFAULT_CONFIG ← ~/.flusk/config.json ← <repo>/.flusk/config.json,
 * merged section-wise. Models are NOT resolved here (offline loads must
 * work); the router resolves them at use.
 *
 * The two layers are NOT equally trusted. `~/.flusk/config.json` is the user's
 * own file; `<repo>/.flusk/config.json` ships inside whatever repository happens
 * to be on disk, so a cloned repo authors it. Four sections are therefore
 * refused from the repo layer entirely:
 *
 *  - `chat.backends`. `flusk ui` loads config from its own cwd and spawns what
 *    that list names, so a repo could otherwise choose the binary a click on
 *    Send executes.
 *  - `doc.servers`. Same threat, same answer: these name language-server
 *    binaries the doc view spawns, so a cloned repo must not choose what
 *    opening a file in the workbench executes.
 *  - `ui.projectDirs` / `ui.harnessDirs`. These are the directories the
 *    history indexer reads, serves over /api/history/search and embeds into
 *    composed prompts, so a repo could otherwise choose whose files leave the
 *    machine.
 *  - `watch`. The whole section: it drives unattended spend and `push`, so a
 *    cloned repo must not raise its own caps or turn publishing on.
 *
 * Everything else (budgets, models, verify, isolation…) stays per-repo: those
 * only steer a run the user has already asked for in that repo.
 *
 * The repo layer may still be read from the deprecated `<repo>/.ah.json`
 * (repo-layer.ts). That changes the FILE it comes from, never the trust: it
 * arrives here as the untrusted layer exactly as the new path does.
 */
import { join } from "node:path";
import { fluskHome } from "../paths/paths.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import { type ConfigLayer, readLayer } from "./layer.js";
import { readRepoLayer } from "./repo-layer.js";
import type { FluskConfig, RepoConfig } from "./types.js";

/**
 * Scan roots only the user's own ~/.flusk/config.json may set. These name the
 * directories the history indexer READS and then serves over the loopback API
 * and embeds into composed prompts; a cloned repo that could point them at
 * `~/clients` would have `flusk ui` publish the head of every .md under it.
 */
const HOME_ONLY_UI = ["projectDirs", "harnessDirs"] as const;

/** The `ui` section a layer is allowed to contribute. */
function uiOf(layer: ConfigLayer, trusted: boolean): Partial<FluskConfig["ui"]> {
	if (layer.ui === undefined) return {};
	if (trusted) return layer.ui;
	const out: Partial<FluskConfig["ui"]> = { ...layer.ui };
	for (const key of HOME_ONLY_UI) delete out[key];
	return out;
}

/** The `chat` section a layer is allowed to contribute. */
function chatOf(layer: ConfigLayer, trusted: boolean): Partial<FluskConfig["chat"]> {
	if (layer.chat === undefined) return {};
	if (trusted) return layer.chat;
	const { backends: _dropped, ...rest } = layer.chat;
	return rest;
}

/** The `doc` section a layer is allowed to contribute — never `servers`. */
function docOf(layer: ConfigLayer, trusted: boolean): Partial<FluskConfig["doc"]> {
	if (layer.doc === undefined || trusted) return layer.doc ?? {};
	const { servers: _dropped, ...rest } = layer.doc;
	return rest;
}

/** The `watch` section a layer may contribute — never from a repo: it drives
 * unattended spend and `push`, so a cloned repo must not raise its own caps. */
function watchOf(layer: ConfigLayer, trusted: boolean): Partial<FluskConfig["watch"]> {
	return trusted ? (layer.watch ?? {}) : {};
}

/** Dotted section/key paths refused from the untrusted repo layer. */
export const REPO_STRIPPED = [
	"chat.backends", "doc.servers", "ui.projectDirs", "ui.harnessDirs", "watch",
] as const;

function mergeLayer(base: FluskConfig, layer: ConfigLayer | null, trusted: boolean): FluskConfig {
	if (!layer) return base;
	return {
		models: { ...base.models, ...layer.models },
		budgets: { ...base.budgets, ...layer.budgets },
		unattended: { ...base.unattended, ...layer.unattended },
		isolation: { ...base.isolation, ...layer.isolation },
		compaction: { ...base.compaction, ...layer.compaction },
		memory: { ...base.memory, ...layer.memory },
		context: { ...base.context, ...layer.context },
		verify: { ...base.verify, ...layer.verify },
		containers: { ...base.containers, ...layer.containers },
		ui: { ...base.ui, ...uiOf(layer, trusted) },
		chat: { ...base.chat, ...chatOf(layer, trusted) },
		doc: { ...base.doc, ...docOf(layer, trusted) },
		watch: { ...base.watch, ...watchOf(layer, trusted) },
	};
}

/**
 * The RepoConfig view of the repo layer: the fields loadConfig ignores
 * (verify[] command list, namespace override). undefined when absent.
 */
export function loadRepoConfig(repoRoot: string): RepoConfig | undefined {
	const layer = readRepoLayer(repoRoot);
	return layer === null ? undefined : (layer as unknown as RepoConfig);
}

export function loadConfig(repoRoot: string): FluskConfig {
	let cfg = structuredClone(DEFAULT_CONFIG);
	cfg = mergeLayer(cfg, readLayer(join(fluskHome(), "config.json")), true);
	cfg = mergeLayer(cfg, readRepoLayer(repoRoot), false);
	return cfg;
}
