/**
 * The documents that tell you how to work in a repository.
 *
 * Split into rules and everything else, because they are read by different
 * readers for different reasons: AGENTS.md and CONTRIBUTING.md constrain what
 * an agent may do here, while the README explains what the thing is. Feeding
 * the second to an agent as though it were the first is how a coding agent
 * ends up quoting marketing copy at you.
 *
 * Only the repo root and one level of docs/ are scanned. A recursive walk of a
 * large repository finds thousands of markdown files, most of them vendored,
 * and produces a list nobody reads.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { DocEntry } from "./types.js";

/** Files whose whole purpose is to state house rules. */
const RULES = new Set([
	"AGENTS.md",
	"CLAUDE.md",
	"CONTRIBUTING.md",
	"CONVENTIONS.md",
	"STYLE.md",
]);

const MAX_DOCS = 40;
const TITLE_SCAN_BYTES = 4096;

/** The first markdown heading, or the filename when there is none. */
function titleOf(path: string, fallback: string): string {
	try {
		const head = readFileSync(path, "utf8").slice(0, TITLE_SCAN_BYTES);
		const m = /^#{1,3}\s+(.+)$/m.exec(head);
		return m?.[1]?.trim() ?? fallback;
	} catch {
		return fallback;
	}
}

function entry(root: string, path: string): DocEntry | null {
	let bytes = 0;
	try {
		const st = statSync(path);
		if (!st.isFile()) return null;
		bytes = st.size;
	} catch {
		return null;
	}
	const rel = relative(root, path);
	const base = rel.split("/").pop() ?? rel;
	const kind = RULES.has(base) ? "rules" : base.toLowerCase() === "readme.md" ? "readme" : "doc";
	return { file: rel, title: titleOf(path, base), kind, bytes };
}

function listMarkdown(dir: string): string[] {
	try {
		return readdirSync(dir)
			.filter((f) => f.toLowerCase().endsWith(".md"))
			.sort()
			.map((f) => join(dir, f));
	} catch {
		return [];
	}
}

export function gatherDocs(root: string): DocEntry[] {
	const paths = [...listMarkdown(root), ...listMarkdown(join(root, "docs"))];
	const out: DocEntry[] = [];
	for (const p of paths) {
		const e = entry(root, p);
		if (e !== null) out.push(e);
		if (out.length >= MAX_DOCS) break;
	}
	// Rules first, then the README, then the rest: the order an agent should
	// read them in, which is not the order the filesystem returns them in.
	const rank = (d: DocEntry): number => (d.kind === "rules" ? 0 : d.kind === "readme" ? 1 : 2);
	return out.sort((a, b) => rank(a) - rank(b) || a.file.localeCompare(b.file));
}
