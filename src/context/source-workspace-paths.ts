/**
 * Turns an absolute workspace path into something a prompt may carry.
 *
 * WorkspaceLayer.source is absolute (`/Users/<someone>/.ah/workspace/SOUL.md`),
 * and that path is the operator's username plus the on-disk layout of their
 * machine. citation.ts:refLabel already refused to put such a path in a block
 * heading; a workspace file is not a HistoryCard, so it cannot call refLabel,
 * but it obeys the same rule — no absolute path reaches `title`, `why`, `path`
 * or `text`. Without this file the context block leaks $HOME to the model.
 *
 * The labels are also what makes this source deterministic under a test
 * AH_HOME: the global directory renders as the fixed string "~/.ah/workspace"
 * however the machine spells it, so the block is byte-identical between runs
 * and between machines (L5).
 */
import { basename, sep } from "node:path";
import { globalWorkspaceDir, projectWorkspaceDir } from "../agent/workspace-files.js";

/** How the global workspace is spelled in a prompt, whatever AH_HOME is. */
export const GLOBAL_LABEL = "~/.ah/workspace";

/** Project-relative path of a project workspace file, or undefined if global. */
export function projectRelPath(source: string, repoRoot: string): string | undefined {
	const dir = projectWorkspaceDir(repoRoot);
	return source.startsWith(dir + sep) ? `.ah/workspace/${basename(source)}` : undefined;
}

/**
 * The citation: "~/.ah/workspace/SOUL.md" or "<project>/.ah/workspace/SOUL.md".
 * A file from neither directory (a caller passing hand-built layers) degrades
 * to its basename rather than to its absolute path.
 */
export function layerLabel(source: string, repoRoot: string): string {
	const rel = projectRelPath(source, repoRoot);
	if (rel !== undefined) return `${basename(repoRoot)}/${rel}`;
	const global = globalWorkspaceDir();
	if (source.startsWith(global + sep)) return `${GLOBAL_LABEL}/${basename(source)}`;
	return basename(source);
}

/**
 * loadWorkspace writes its notes with absolute paths in them ("skipped
 * /Users/…/SOUL.md: EISDIR"). The sentences are kept verbatim in every other
 * respect — they are the L7 degradation reason — but the paths inside them are
 * rewritten to the same labels the items use, because a note is read by the
 * same people and copied into the same reports.
 *
 * Longest prefix first: the project workspace lives under the repo root, so
 * replacing repoRoot first would leave a half-rewritten path behind.
 */
export function relativiseNote(note: string, repoRoot: string): string {
	const project = basename(repoRoot);
	return note
		.replaceAll(projectWorkspaceDir(repoRoot), `${project}/.ah/workspace`)
		.replaceAll(globalWorkspaceDir(), GLOBAL_LABEL)
		.replaceAll(repoRoot, project);
}
