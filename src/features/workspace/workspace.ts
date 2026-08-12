/**
 * loadWorkspace: the three markdown layers flusk injects into every prompt.
 *
 * Precedence, ascending: the global workspace (`~/.flusk/workspace`), then the
 * project one (`<repo>/.flusk/workspace`) which REPLACES a global file of the
 * same kind, then the repository's own house rules (AGENTS.md / CLAUDE.md) —
 * the file the humans on the project already maintain, which is the whole
 * point: the agent that edits their code should have read their rules.
 *
 * Never throws. A workspace that cannot be read is a workspace that is absent.
 */
import { join } from "node:path";
import {
	clip,
	FILE_MAX,
	globalWorkspaceDir,
	HOUSE_FILES,
	type LayerKind,
	projectWorkspaceDir,
	readLayerText,
	TOTAL_MAX,
	WORKSPACE_FILES,
	type WorkspaceLayer,
	type WorkspaceLayers,
} from "./workspace-files.repository.js";

export type { LayerKind, WorkspaceLayer, WorkspaceLayers } from "./workspace-files.repository.js";
export {
	FILE_MAX,
	globalWorkspaceDir,
	HOUSE_FILES,
	projectWorkspaceDir,
	TOTAL_MAX,
	WORKSPACE_FILES,
} from "./workspace-files.repository.js";

function load(kind: LayerKind, source: string, notes: string[]): WorkspaceLayer | undefined {
	const text = readLayerText(source, notes);
	if (text === undefined) return undefined;
	const cut = clip(text, FILE_MAX);
	if (cut.truncated) notes.push(`truncated ${source} to the ${FILE_MAX}-character file cap`);
	return { kind, source, text: cut.text, truncated: cut.truncated };
}

/**
 * Second cap, over the whole workspace. Earlier layers are the load-bearing
 * ones (identity, then the constraints that override the task), so the budget
 * is spent in prompt order and the tail is what gets cut.
 */
function fitTotal(layers: WorkspaceLayer[], notes: string[]): WorkspaceLayer[] {
	const out: WorkspaceLayer[] = [];
	let used = 0;
	for (const layer of layers) {
		const room = TOTAL_MAX - used;
		const cut = room > 0 ? clip(layer.text, room) : { text: "", truncated: true };
		if (cut.text === "") {
			notes.push(`skipped ${layer.source}: the ${TOTAL_MAX}-character workspace cap is full`);
			continue;
		}
		if (cut.truncated)
			notes.push(`truncated ${layer.source}: ${TOTAL_MAX}-character workspace cap`);
		used += cut.text.length;
		out.push({ ...layer, text: cut.text, truncated: layer.truncated || cut.truncated });
	}
	return out;
}

export function loadWorkspace(repoRoot: string): WorkspaceLayers {
	const notes: string[] = [];
	const byKind = new Map<LayerKind, WorkspaceLayer>();
	for (const dir of [globalWorkspaceDir(), projectWorkspaceDir(repoRoot)]) {
		for (const [kind, file] of WORKSPACE_FILES) {
			const layer = load(kind, join(dir, file), notes);
			if (layer !== undefined) byKind.set(kind, layer); // project overwrites global
		}
	}
	// Both are read when both exist: a repo that keeps two of these keeps them
	// for two audiences, and dropping one silently loses rules.
	const house = HOUSE_FILES.map((f) => load("house", join(repoRoot, f), notes)).filter(
		(l): l is WorkspaceLayer => l !== undefined,
	);
	const ordered = [byKind.get("identity"), byKind.get("soul"), ...house, byKind.get("tools")];
	return {
		layers: fitTotal(
			ordered.filter((l): l is WorkspaceLayer => l !== undefined),
			notes,
		),
		notes,
	};
}

/** Every path the workspace would read, in precedence order. For `flusk workspace show`. */
export function workspacePaths(repoRoot: string, projectOnly = false): string[] {
	const dirs = projectOnly
		? [projectWorkspaceDir(repoRoot)]
		: [globalWorkspaceDir(), projectWorkspaceDir(repoRoot)];
	return [
		...dirs.flatMap((d) => WORKSPACE_FILES.map(([, file]) => join(d, file))),
		...HOUSE_FILES.map((f) => join(repoRoot, f)),
	];
}
