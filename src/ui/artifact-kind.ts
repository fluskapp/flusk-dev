/**
 * Where a markdown file sits inside a project decides what it is. Paths are
 * project-relative and always `/`-separated (the scanner joins them that way).
 */

export type ArtifactKind = "context" | "plan" | "doc" | "readme" | "skill" | "note";

/** Directories that are never a project's own writing. */
export const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"target",
	"build",
	"coverage",
	".next",
]);

/** `null` means "not an artifact" — buried notes and run journals are skipped. */
export function classifyArtifact(rel: string): ArtifactKind | null {
	const parts = rel.split("/");
	const name = parts[parts.length - 1] ?? "";
	const dirs = parts.slice(0, -1);
	if (!name.endsWith(".md")) return null;
	if (name === "SKILL.md") return "skill";
	if (dirs[0] === ".claude" && dirs[1] === "skills") return "skill";
	if (name === "CLAUDE.md" || name === "AGENTS.md") return "context";
	if (name === "README.md") return "readme";
	if (dirs[0] === "plans") return "plan";
	if (dirs[0] === "docs") return dirs[1] === "runs" ? null : "doc"; // runs have their own view
	return dirs.length === 0 ? "note" : null;
}
