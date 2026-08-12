/**
 * Where the workspace lives on disk, and how one file becomes one layer.
 *
 * The workspace is user-owned markdown that flusk injects into the system prompt,
 * so behaviour is tuned by editing files rather than TypeScript. Reading is
 * deliberately forgiving: a missing file is the normal case, and no workspace
 * problem may ever fail a run.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { redact } from "../history/scrub.js";
import { fluskHome } from "../session/paths.js";

/** Prompt order: who you are, what you may never do, the repo's rules, tools. */
export type LayerKind = "identity" | "soul" | "house" | "tools";

export interface WorkspaceLayer {
	kind: LayerKind;
	/** Absolute path of the file this text came from; shown in the prompt. */
	source: string;
	text: string;
	truncated: boolean;
}

export interface WorkspaceLayers {
	layers: WorkspaceLayer[];
	/** Why a file was skipped or cut. Notes, never errors. */
	notes: string[];
}

export const FILE_MAX = 6000;
export const TOTAL_MAX = 16000;

/** kind → filename, in prompt order. Global and project dirs both hold these. */
export const WORKSPACE_FILES: ReadonlyArray<readonly [LayerKind, string]> = [
	["identity", "IDENTITY.md"],
	["soul", "SOUL.md"],
	["tools", "TOOLS.md"],
];

/** House rules flusk did not invent: the repository's own agent instructions. */
export const HOUSE_FILES = ["AGENTS.md", "CLAUDE.md"] as const;

export const globalWorkspaceDir = (): string => join(fluskHome(), "workspace");

export const projectWorkspaceDir = (repoRoot: string): string => join(repoRoot, ".flusk", "workspace");

/** Cuts at the last line boundary that fits, so a rule is never half-quoted. */
export function clip(text: string, max: number): { text: string; truncated: boolean } {
	if (text.length <= max) return { text, truncated: false };
	const cut = text.slice(0, max);
	const nl = cut.lastIndexOf("\n");
	return { text: (nl > 0 ? cut.slice(0, nl) : cut).trimEnd(), truncated: true };
}

/**
 * Reads one workspace file, or returns undefined. Absent is silent; anything
 * else (a directory in its place, no permission) is skipped with a note.
 *
 * Every byte goes through redact() first: this text is bound for a prompt, and
 * a user's own notes are exactly where a pasted token goes unnoticed.
 */
export function readLayerText(source: string, notes: string[]): string | undefined {
	let raw: string;
	try {
		raw = readFileSync(source, "utf8");
	} catch (e) {
		const err = e as NodeJS.ErrnoException;
		if (err.code !== "ENOENT") notes.push(`skipped ${source}: ${err.code ?? err.message}`);
		return undefined;
	}
	const text = redact(raw).trim();
	return text === "" ? undefined : text;
}
