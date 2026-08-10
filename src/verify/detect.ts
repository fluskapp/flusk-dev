/**
 * Verify-command detection. A .hit.json verify[] wins outright; otherwise
 * package.json scripts, then Cargo.toml, then a Makefile test target.
 * Detected commands persist as coexisting Repo verify_cmd facts
 * (docs/vocabulary.md) so future runs recall them without re-detection.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RepoConfig } from "../config/types.js";
import type { MemoryClient } from "../memory/client-types.js";
import { repoFact } from "../memory/facts.js";

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

/**
 * Best-effort persistence — callers catch. One transact per command: a
 * single transact may not assert the same (subject, predicate) twice
 * (abagraph transact_guards), even for coexist predicates. All writes go
 * via transact — never /api/digest, which nulls the tenant for admin.
 */
export async function persistVerifyCommands(
	client: MemoryClient,
	ns: string,
	commands: string[],
): Promise<void> {
	const slug = ns.startsWith("repo:") ? ns.slice("repo:".length) : ns;
	for (const cmd of commands) {
		await client.transact(ns, [repoFact.verifyCmd(slug, cmd)]);
	}
}
