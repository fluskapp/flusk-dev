/**
 * Reading one directory of `*.md` specs. Total: it returns what it refused
 * instead of throwing, because ONE unreadable file must never blank the
 * registry — the failure mode this whole seam exists to avoid is an
 * orchestrator that has no agents and cannot say why.
 *
 * A missing directory is not an issue (most repos have no `.flusk/agents/`); an
 * unreadable one is. Every entry is proven inside its jail with
 * `resolveWithin`, so a symlink planted in a repo cannot make a file from
 * elsewhere on disk load as a project spec.
 *
 * Order is alphabetical by filename, matching the extension loader, so two
 * runs over the same disk produce the same registry.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveWithin } from "../safety/paths.js";
import type { AgentDir } from "./dirs.js";
import { parseAgentSpec } from "./spec-parse.js";
import type { AgentSpec, SpecLoadIssue } from "./types.js";

export interface ScanResult {
	specs: AgentSpec[];
	issues: SpecLoadIssue[];
}

function reason(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/** Files only, `.md` only, sorted. Directories are not recursed into. */
function specFiles(dir: string): string[] | { error: string } {
	try {
		return readdirSync(dir, { withFileTypes: true })
			.filter((e) => !e.isDirectory() && e.name.toLowerCase().endsWith(".md"))
			.map((e) => e.name)
			.sort();
	} catch (err) {
		const code = (err as NodeJS.ErrnoException).code;
		if (code === "ENOENT") return [];
		return { error: reason(err) };
	}
}

export function scanAgentDir(location: AgentDir): ScanResult {
	const names = specFiles(location.dir);
	if (!Array.isArray(names)) {
		return { specs: [], issues: [{ source: location.dir, reason: names.error }] };
	}
	const specs: AgentSpec[] = [];
	const issues: SpecLoadIssue[] = [];
	for (const name of names) {
		const nominal = join(location.dir, name);
		let source: string;
		let text: string;
		try {
			source = resolveWithin(location.roots, name, location.dir);
			text = readFileSync(source, "utf8");
		} catch (err) {
			issues.push({ source: nominal, reason: reason(err) });
			continue;
		}
		const parsed = parseAgentSpec(text, source, location.scope);
		if (parsed.ok) specs.push(parsed.spec);
		else issues.push({ source, reason: parsed.reason });
	}
	return { specs, issues };
}
