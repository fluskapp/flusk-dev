/**
 * Where a repository's own config lives, and the one release of grace given to
 * the file it used to live in.
 *
 * The rename collapsed a split file-and-directory (`<repo>/.ah.json` beside
 * `<repo>/.ah/`) into one directory, `<repo>/.flusk/`, with the config inside
 * it. A repo that still carries the old file is read — once, loudly — so that
 * cloning a not-yet-updated project does not silently drop its settings.
 *
 * The fallback changes WHERE the layer is read from and nothing else. It is
 * still the repo layer, so it is still untrusted: config.ts strips the same
 * refused sections from it either way. A compatibility path that quietly gained
 * trust would be a far worse bug than the one it was added to avoid.
 */
import { join } from "node:path";
import { type ConfigLayer, readLayer } from "./layer.js";

/** The repo config, relative to the repo root. */
export const REPO_CONFIG_REL = ".flusk/config.json";

/** The pre-rename location. Read-only, deprecated, removed next release. */
export const LEGACY_REPO_CONFIG_REL = ".ah.json";

export const repoConfigPath = (repoRoot: string): string => join(repoRoot, REPO_CONFIG_REL);

/** Paths already warned about, so a long-lived `flusk ui` says it once. */
const warned = new Set<string>();

function warnDeprecated(path: string): void {
	if (warned.has(path)) return;
	warned.add(path);
	process.stderr.write(
		`flusk: ${path} is deprecated and will stop being read in the next release; ` +
			`move it to ${REPO_CONFIG_REL}\n`,
	);
}

/** Which file the repo layer actually came from, or null when there is none. */
export function repoLayerSource(repoRoot: string): string | null {
	const current = repoConfigPath(repoRoot);
	if (readLayer(current) !== null) return current;
	const legacy = join(repoRoot, LEGACY_REPO_CONFIG_REL);
	return readLayer(legacy) === null ? null : legacy;
}

/**
 * The repo layer, from the current path if it exists and the legacy one
 * otherwise. Never merges the two: a repo mid-migration has one answer, the
 * new file, and the old one stops being consulted the moment it is replaced.
 */
export function readRepoLayer(repoRoot: string): ConfigLayer | null {
	const current = readLayer(repoConfigPath(repoRoot));
	if (current !== null) return current;
	const legacyPath = join(repoRoot, LEGACY_REPO_CONFIG_REL);
	const legacy = readLayer(legacyPath);
	if (legacy !== null) warnDeprecated(legacyPath);
	return legacy;
}
