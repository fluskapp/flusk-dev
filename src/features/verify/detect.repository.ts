/**
 * Verify-command detection. A .flusk/config.json verify[] wins outright; otherwise
 * package.json scripts, then Cargo.toml, then a Makefile test target.
 *
 * The answer is derived from the repository on every run rather than
 * remembered: the files it reads are the authority, so a remembered list could
 * only ever be a staler copy of them — and it would keep proposing the test
 * command of a project that has since dropped it.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RepoConfig } from "../../platform/config/types.js";

/** package.json scripts checked in this order; "test" maps to `npm test`. */
const NPM_SCRIPT_ORDER = ["typecheck", "lint", "test", "build"];

export function detectVerifyCommands(repoRoot: string, repoConfig?: RepoConfig): string[] {
	if (repoConfig?.verify !== undefined) return [...repoConfig.verify];
	const fromNpm = npmCommands(repoRoot);
	if (fromNpm.length > 0) return fromNpm;
	if (existsSync(join(repoRoot, "Cargo.toml"))) return ["cargo check", "cargo test"];
	if (makefileHasTestTarget(repoRoot)) return ["make test"];
	return [];
}

function npmCommands(repoRoot: string): string[] {
	const raw = readText(join(repoRoot, "package.json"));
	if (raw === null) return [];
	let scripts: Record<string, unknown>;
	try {
		scripts = (JSON.parse(raw) as { scripts?: Record<string, unknown> }).scripts ?? {};
	} catch {
		return [];
	}
	return NPM_SCRIPT_ORDER.filter((name) => typeof scripts[name] === "string").map((name) =>
		name === "test" ? "npm test" : `npm run ${name}`,
	);
}

function makefileHasTestTarget(repoRoot: string): boolean {
	const text = readText(join(repoRoot, "Makefile"));
	// A `test:` rule at column 0; `(?!=)` excludes a `test :=` assignment.
	return text !== null && /^test\s*:(?!=)/m.test(text);
}

function readText(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return null;
	}
}
