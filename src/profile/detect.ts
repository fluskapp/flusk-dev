/**
 * Turning a repository's manifests into a profile, with a citation per claim.
 *
 * The detections are deliberately shallow: a dependency name, a script name, a
 * service in a compose file. Deep inference — reading source to decide which
 * framework is "really" in use — is where a profiler starts being confidently
 * wrong, and a wrong profile produces wrong advice that reads exactly like
 * right advice.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Detected, DetectedKind, Evidence } from "./types.js";
import { allDeps, type Manifests } from "./manifests.js";
import { mainRepoOf } from "./worktree.js";

/** dependency name -> [detected name, kind]. Substring-free: exact matches. */
const DEP_SIGNALS: Record<string, [string, DetectedKind]> = {
	typescript: ["typescript", "language"],
	react: ["react", "framework"],
	vue: ["vue", "framework"],
	svelte: ["svelte", "framework"],
	next: ["next", "framework"],
	express: ["express", "framework"],
	fastify: ["fastify", "framework"],
	vitest: ["vitest", "tool"],
	jest: ["jest", "tool"],
	mocha: ["mocha", "tool"],
	eslint: ["eslint", "tool"],
	prettier: ["prettier", "tool"],
	"@biomejs/biome": ["biome", "tool"],
	playwright: ["browser-testing", "tool"],
	"@playwright/test": ["browser-testing", "tool"],
	puppeteer: ["browser-testing", "tool"],
	cypress: ["browser-testing", "tool"],
	pg: ["postgres", "service"],
	postgres: ["postgres", "service"],
	"better-sqlite3": ["sqlite", "service"],
	sqlite3: ["sqlite", "service"],
	mongodb: ["mongodb", "service"],
	redis: ["redis", "service"],
	ioredis: ["redis", "service"],
	prisma: ["migrations", "tool"],
	"drizzle-kit": ["migrations", "tool"],
	knex: ["migrations", "tool"],
	typeorm: ["migrations", "tool"],
};

/** A word in a text manifest -> [detected name, kind]. */
const TEXT_SIGNALS: [RegExp, string, DetectedKind][] = [
	[/^\s*image:\s*\S*postgres/m, "postgres", "service"],
	[/^\s*image:\s*\S*redis/m, "redis", "service"],
	[/^\s*image:\s*\S*mongo/m, "mongodb", "service"],
	[/\[package\]/, "rust", "language"],
	[/^\s*module\s+\S+/m, "go", "language"],
	[/^\s*\[project\]/m, "python", "language"],
];

function add(into: Detected[], name: string, kind: DetectedKind, ev: Evidence): void {
	const found = into.find((d) => d.name === name);
	if (found === undefined) into.push({ name, kind, evidence: [ev] });
	else if (!found.evidence.some((e) => e.file === ev.file)) found.evidence.push(ev);
}

/** Script names that mean "this is how the project is verified or shipped". */
const SCRIPT_SIGNALS: [RegExp, string, DetectedKind][] = [
	[/^test(:|$)/, "test-runner", "tool"],
	[/^(release|publish)(:|$)/, "release-script", "tool"],
	[/^(migrate|migration)/, "migrations", "tool"],
];

export function detectAll(root: string, m: Manifests): Detected[] {
	const out: Detected[] = [];

	for (const dep of allDeps(m.pkg)) {
		const sig = DEP_SIGNALS[dep];
		if (sig !== undefined) {
			add(out, sig[0], sig[1], { file: "package.json", note: `depends on ${dep}` });
		}
	}
	if (m.pkg !== null) {
		add(out, "node", "runtime", { file: "package.json", note: "a Node package" });
		for (const name of Object.keys(m.pkg.scripts ?? {})) {
			for (const [re, detected, kind] of SCRIPT_SIGNALS) {
				if (re.test(name)) add(out, detected, kind, { file: "package.json", note: `script "${name}"` });
			}
		}
	}

	for (const [file, text] of m.text) {
		for (const [re, name, kind] of TEXT_SIGNALS) {
			const hit = re.exec(text);
			if (hit !== null) {
				add(out, name, kind, { file, note: hit[0].trim().slice(0, 60) });
			}
		}
	}

	// A GitHub remote is the one signal not in a manifest, and the config file
	// is read rather than `git remote` shelled out to: this must stay a pure
	// read of the working tree.
	// A WORKTREE's .git is a file, so it has no .git/config of its own — the
	// remote lives in the repo it was created from. Without this, profiling a
	// worktree silently reports no git and no GitHub, which is exactly what
	// this workbench's own worktrees did.
	const gitRoot = mainRepoOf(root) ?? root;
	const gitConfig = join(gitRoot, ".git", "config");
	if (existsSync(gitConfig)) {
		add(out, "git", "tool", { file: ".git/config", note: "a git repository" });
		try {
			const text = readFileSync(gitConfig, "utf8");
			if (/github\.com/.test(text)) {
				add(out, "github", "service", { file: ".git/config", note: "a github.com remote" });
			}
		} catch {
			// A worktree's .git is a file, and an unreadable config is not an
			// error here — it only means one fewer signal.
		}
	}
	return out;
}

/** Detections that came from a service, so the advisor can group them. */
export const byKind = (all: Detected[], kind: DetectedKind): Detected[] =>
	all.filter((d) => d.kind === kind);
