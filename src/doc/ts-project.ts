/**
 * What a TypeScript project is, before any language service exists: which
 * files are in it, how many there are, and which compiler options apply.
 *
 * Split from ts-service.ts because the file-count cap has to be answerable
 * WITHOUT paying for a service — refusing a 60k-file monorepo politely is the
 * whole point, and you cannot refuse it after you have already indexed it.
 */
import { type Dirent, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

type TS = typeof import("typescript");

/** Directories no source file worth documenting lives in. */
const SKIP = new Set(["node_modules", "dist", "build", "out", "target", ".git", "coverage"]);
const SOURCE = /\.(?:m|c)?(?:t|j)sx?$/;

/** Files above this are a monorepo, not a project; the caller is told, not hung. */
export const DEFAULT_FILE_CAP = 4000;

export interface Scan {
	files: string[];
	/** True when the walk stopped early: `files` is then a prefix, not the set. */
	overCap: boolean;
}

/**
 * Candidate source files under `root`, depth-first, stopping the instant the
 * cap is exceeded — an over-cap answer costs `cap` reads, not the whole tree.
 */
export function scanProject(root: string, cap = DEFAULT_FILE_CAP): Scan {
	const files: string[] = [];
	const stack: string[] = [root];
	while (stack.length > 0) {
		const dir = stack.pop() as string;
		let entries: Dirent[];
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			continue; // unreadable directory: skipped, never fatal
		}
		for (const e of entries) {
			if (SKIP.has(e.name)) continue;
			const path = join(dir, e.name);
			if (e.isDirectory()) stack.push(path);
			else if (e.isFile() && SOURCE.test(e.name) && !e.name.endsWith(".d.ts")) {
				files.push(path);
				if (files.length > cap) return { files, overCap: true };
			}
		}
	}
	return { files, overCap: false };
}

export interface ProjectConfig {
	options: import("typescript").CompilerOptions;
	/** From tsconfig include/exclude when there is one, else the scan. */
	files: string[];
	configPath: string | null;
}

/** Enough to resolve and check a modern Node project that ships no tsconfig. */
function defaults(ts: TS): import("typescript").CompilerOptions {
	return {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		jsx: ts.JsxEmit.Preserve,
		allowJs: true,
		strict: true,
		skipLibCheck: true,
		noEmit: true,
	};
}

/**
 * The project's compiler options and file set. A tsconfig.json is honoured
 * when present — including its include/exclude — and anything unreadable or
 * malformed in it falls back to the defaults rather than failing lookup.
 *
 * The basePath is the CONFIG'S OWN directory, not `root`. `findConfigFile`
 * walks up to ancestors, so a tsconfig found above `root` has its include,
 * exclude, baseUrl, paths and typeRoots resolved relative to itself — resolve
 * them against `root` instead and every relative path in it points at the
 * wrong place, which turns unresolved imports into `any` and quietly makes
 * every quickinfo signature wrong.
 */
export function projectConfig(ts: TS, root: string, scan: Scan): ProjectConfig {
	const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
	if (configPath === undefined)
		return { options: defaults(ts), files: scan.files, configPath: null };
	try {
		const read = ts.readConfigFile(configPath, ts.sys.readFile);
		if (read.error !== undefined || read.config === undefined) throw new Error("unreadable");
		const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, dirname(configPath));
		const files = parsed.fileNames.length > 0 ? parsed.fileNames : scan.files;
		return { options: { ...parsed.options, noEmit: true }, files, configPath };
	} catch {
		return { options: defaults(ts), files: scan.files, configPath: null };
	}
}
