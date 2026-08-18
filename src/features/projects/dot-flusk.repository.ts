/**
 * The `.flusk` directory scan for the Config window's tree: names, kinds and
 * sizes only — no file contents, the /files/$ viewer is the read path. One
 * level deep (top-level files plus each directory's direct children), capped
 * so a runaway runs/ directory cannot flood the window.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export type DotFluskKind =
	| "config"
	| "workbench"
	| "spec"
	| "runconfig"
	| "flow"
	| "agent"
	| "extension"
	| "harness"
	| "workspace"
	| "other";

export interface DotFluskEntry {
	/** Path relative to `.flusk/`: "config.json", "specs/plan.md". */
	rel: string;
	abs: string;
	kind: DotFluskKind;
	size: number;
}

/** The documented anatomy (docs/dot-flusk.md); unknown dirs read as `other`. */
const DIR_KIND: Record<string, DotFluskKind> = {
	specs: "spec",
	runs: "runconfig",
	flows: "flow",
	agents: "agent",
	extensions: "extension",
	harnesses: "harness",
	workspace: "workspace",
};

const FILE_KIND: Record<string, DotFluskKind> = {
	"config.json": "config",
	"workbench.json": "workbench",
};

const CAP = 200;

function fileEntry(root: string, rel: string, kind: DotFluskKind): DotFluskEntry | null {
	const abs = join(root, rel);
	try {
		const st = statSync(abs);
		return st.isFile() ? { rel, abs, kind, size: st.size } : null;
	} catch {
		return null;
	}
}

const names = (dir: string): string[] => {
	try {
		return readdirSync(dir).sort();
	} catch {
		return [];
	}
};

/** Sorted dir-then-name; `[]` when the repo has no `.flusk` at all. */
export function scanDotFlusk(repoRoot: string): DotFluskEntry[] {
	const root = join(repoRoot, ".flusk");
	const out: DotFluskEntry[] = [];
	const top = names(root);
	for (const name of top) {
		const entry = fileEntry(root, name, FILE_KIND[name] ?? "other");
		if (entry !== null) out.push(entry);
	}
	for (const name of top) {
		const kind = DIR_KIND[name] ?? "other";
		for (const child of names(join(root, name))) {
			const entry = fileEntry(root, join(name, child), kind);
			if (entry !== null) out.push(entry);
			if (out.length >= CAP) return out.slice(0, CAP);
		}
	}
	return out.slice(0, CAP);
}
