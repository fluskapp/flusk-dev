/**
 * The spec files on disk — `.flusk/specs/<name>.md`, read and written nowhere
 * else. Scanning refuses per FILE, never per directory: one unparseable spec
 * lands in `skipped` with its reason while the rest keep listing.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpec, withStatus } from "./spec-frontmatter.js";
import { SPEC_DIR, type Spec, type SpecMeta, type SpecScan, type SpecStatus } from "./spec.types.js";

/** A name is a file stem — a handle, never a path. */
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const validSpecName = (name: string): boolean => NAME.test(name) && !name.includes("..");

const fileOf = (repoRoot: string, name: string): string => join(repoRoot, SPEC_DIR, `${name}.md`);
/** Repo-relative, the way SpecMeta.path is defined. */
const pathOf = (name: string): string => `${SPEC_DIR}/${name}.md`;

export type SpecOpen = { ok: true; spec: Spec } | { ok: false; why: string };

/** One spec, or the reason there is not one — the scan and the CLI both need
 * the why, so `readSpec`'s null is derived from this rather than the reverse. */
export function openSpec(repoRoot: string, name: string): SpecOpen {
	if (!validSpecName(name)) return { ok: false, why: `"${name}" is not a valid spec name` };
	const file = fileOf(repoRoot, name);
	let text: string;
	let mtimeMs: number;
	try {
		text = readFileSync(file, "utf8");
		mtimeMs = statSync(file).mtimeMs;
	} catch (e) {
		return { ok: false, why: e instanceof Error ? e.message : String(e) };
	}
	const parsed = parseSpec(text);
	if (!parsed.ok) return parsed;
	const s = parsed.spec;
	return {
		ok: true,
		spec: {
			name,
			title: s.title ?? name,
			status: s.status,
			mode: s.mode,
			acceptance: s.acceptance,
			path: pathOf(name),
			updatedAt: new Date(mtimeMs).toISOString(),
			body: s.body,
		},
	};
}

export function readSpec(repoRoot: string, name: string): Spec | null {
	const r = openSpec(repoRoot, name);
	return r.ok ? r.spec : null;
}

/** Every spec in the repo, name order; the unreadable ones say why. */
export function scanSpecs(repoRoot: string): SpecScan {
	let files: string[] = [];
	try {
		files = readdirSync(join(repoRoot, SPEC_DIR)).filter((f) => f.endsWith(".md"));
	} catch {
		return { specs: [], skipped: [] }; // a repo without specs is normal, not an error
	}
	const specs: SpecMeta[] = [];
	const skipped: SpecScan["skipped"] = [];
	for (const f of files.sort()) {
		const r = openSpec(repoRoot, f.slice(0, -3));
		if (r.ok) {
			const { body: _body, ...meta } = r.spec;
			specs.push(meta);
		} else {
			skipped.push({ path: `${SPEC_DIR}/${f}`, why: r.why });
		}
	}
	return { specs, skipped };
}

/** Writes a NEW spec; an existing file is refused (EEXIST), never replaced —
 * `flusk spec new` must not eat a spec someone already wrote. */
export function createSpecFile(repoRoot: string, name: string, content: string): string {
	if (!validSpecName(name)) {
		throw new Error(`spec name "${name}" — letters, digits, dot, dash and underscore only`);
	}
	mkdirSync(join(repoRoot, SPEC_DIR), { recursive: true });
	writeFileSync(fileOf(repoRoot, name), content, { flag: "wx" });
	return pathOf(name);
}

export function setSpecStatus(repoRoot: string, name: string, status: SpecStatus): string {
	if (!validSpecName(name)) throw new Error(`"${name}" is not a valid spec name`);
	const file = fileOf(repoRoot, name);
	const next = withStatus(readFileSync(file, "utf8"), status);
	if (next === null) throw new Error(`${pathOf(name)} has no frontmatter to update`);
	writeFileSync(file, next);
	return pathOf(name);
}
