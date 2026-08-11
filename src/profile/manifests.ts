/**
 * Reading the files that declare what a repository is made of.
 *
 * Every reader here is total: a manifest that does not exist, cannot be read,
 * or is not valid JSON yields nothing and records the path as unreadable. A
 * profiler that throws on a malformed package.json is a profiler that fails on
 * exactly the repositories most worth profiling.
 *
 * Only files at the repo ROOT are read. Walking node_modules or a vendored
 * tree to find more manifests would describe someone else's project.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface Manifests {
	/** package.json parsed, or null. */
	pkg: PackageJson | null;
	/** Raw text of the manifests that are not JSON, keyed by repo-relative path. */
	text: Map<string, string>;
	unreadable: string[];
}

export interface PackageJson {
	name?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	optionalDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

/** Text manifests worth reading whole; each is small and declarative. */
const TEXT_FILES = [
	"Cargo.toml",
	"pyproject.toml",
	"requirements.txt",
	"go.mod",
	"Gemfile",
	"docker-compose.yml",
	"docker-compose.yaml",
	"compose.yml",
	"compose.yaml",
	"Dockerfile",
	"Makefile",
];

/** Cap per file: a manifest is declarative, and a 10MB one is not a manifest. */
const MAX_BYTES = 256 * 1024;

function readCapped(path: string): string | null {
	try {
		const text = readFileSync(path, "utf8");
		return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
	} catch {
		return null;
	}
}

export function readManifests(root: string): Manifests {
	const out: Manifests = { pkg: null, text: new Map(), unreadable: [] };

	const pkgRaw = readCapped(join(root, "package.json"));
	if (pkgRaw !== null) {
		try {
			const parsed: unknown = JSON.parse(pkgRaw);
			// An array or a string is valid JSON and not a package.json.
			if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
				out.pkg = parsed as PackageJson;
			} else {
				out.unreadable.push("package.json");
			}
		} catch {
			// Malformed rather than absent: worth saying, because every
			// dependency-based detection below is now blind.
			out.unreadable.push("package.json");
		}
	}

	for (const name of TEXT_FILES) {
		const text = readCapped(join(root, name));
		if (text !== null) out.text.set(name, text);
	}
	return out;
}

/** Every declared dependency, whatever section it sits in. */
export function allDeps(pkg: PackageJson | null): Set<string> {
	const out = new Set<string>();
	if (pkg === null) return out;
	for (const section of [
		pkg.dependencies,
		pkg.devDependencies,
		pkg.optionalDependencies,
		pkg.peerDependencies,
	]) {
		for (const name of Object.keys(section ?? {})) out.add(name);
	}
	return out;
}
