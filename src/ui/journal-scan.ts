/**
 * Harness run journals — the markdown files other harnesses (linof-harness,
 * ab) write per run under `docs/runs/`. ah reads them so a watch autopilot can
 * be followed live from one dashboard, which is what aihub used to do.
 *
 * Frontmatter is parsed by hand: the shape is fixed (scalar keys plus one
 * nested `stages:` block) and ah takes no YAML dependency.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export interface JournalStage {
	name: string;
	status: string;
	duration: string;
	detail: string;
}

export interface Journal {
	/** Path relative to nothing — the handle the UI passes back. */
	path: string;
	harness: string;
	title: string;
	date: string;
	status: string;
	kind?: string;
	tool?: string;
	pr?: string;
	stages: JournalStage[];
}

function unquote(v: string): string {
	const t = v.trim();
	return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

/** `"done|4.7s|review · tools: claude"` → structured stage. */
function parseStage(name: string, raw: string): JournalStage {
	const [status = "", duration = "", ...rest] = unquote(raw).split("|");
	return { name, status, duration, detail: rest.join("|") };
}

export function parseFrontmatter(text: string): Omit<Journal, "path" | "harness"> | null {
	if (!text.startsWith("---")) return null;
	const end = text.indexOf("\n---", 3);
	if (end === -1) return null;
	const out: Record<string, string> = {};
	const stages: JournalStage[] = [];
	let inStages = false;
	for (const line of text.slice(4, end).split("\n")) {
		if (line.trim() === "") continue;
		if (/^\s{2,}\S/.test(line) && inStages) {
			const m = /^\s+([\w-]+):\s*(.*)$/.exec(line);
			if (m) stages.push(parseStage(m[1] ?? "", m[2] ?? ""));
			continue;
		}
		inStages = false;
		const m = /^([\w-]+):\s*(.*)$/.exec(line);
		if (!m) continue;
		if (m[1] === "stages") {
			inStages = true;
			continue;
		}
		out[m[1] ?? ""] = unquote(m[2] ?? "");
	}
	return {
		title: out.title ?? "(untitled)",
		date: out.date ?? "",
		status: out.status ?? "unknown",
		...(out.kind !== undefined ? { kind: out.kind } : {}),
		...(out.tool !== undefined ? { tool: out.tool } : {}),
		...(out.pr !== undefined ? { pr: out.pr } : {}),
		stages,
	};
}

/** `~` expansion only — these come from config, not from a request. */
export function expandHome(p: string): string {
	return p.startsWith("~/") ? join(homedir(), p.slice(2)) : p;
}

/**
 * Directories to scan. A pattern's single `*` is expanded one level, so
 * "~/projects/*<!---->/docs/runs" finds every project's journal directory.
 */
export function resolveJournalDirs(patterns: string[]): string[] {
	const dirs: string[] = [];
	for (const pattern of patterns) {
		const full = expandHome(pattern);
		const star = full.indexOf("*");
		if (star === -1) {
			dirs.push(full);
			continue;
		}
		const parent = dirname(full.slice(0, star + 1));
		const suffix = full.slice(full.indexOf("/", star) + 1);
		let entries: string[] = [];
		try {
			entries = readdirSync(parent);
		} catch {
			continue;
		}
		for (const e of entries) dirs.push(join(parent, e, suffix));
	}
	return dirs;
}

export function scanJournals(patterns: string[], limit = 60): Journal[] {
	const out: Journal[] = [];
	for (const dir of resolveJournalDirs(patterns)) {
		let files: string[] = [];
		try {
			files = readdirSync(dir).filter((f) => f.endsWith(".md"));
		} catch {
			continue; // a project without journals is normal, not an error
		}
		const harness = basename(resolve(dir, "..", ".."));
		for (const f of files.sort().reverse().slice(0, limit)) {
			const path = join(dir, f);
			try {
				const head = readFileSync(path, "utf8").slice(0, 8000);
				const meta = parseFrontmatter(head);
				if (meta === null) continue;
				out.push({ path, harness, ...meta, date: meta.date || statSync(path).mtime.toISOString() });
			} catch {
				// unreadable journal — skip it rather than fail the view
			}
		}
	}
	return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
