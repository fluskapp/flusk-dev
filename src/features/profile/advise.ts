/**
 * Profile in, suggestions out — each one carrying the evidence that produced it.
 *
 * The invariant this file exists to hold: a suggestion is emitted ONLY when
 * every signal its catalog row asks for was actually detected, and it carries
 * the evidence of those detections verbatim. There is no "you might also
 * like": a recommender that guesses is one whose right answers are
 * indistinguishable from its wrong ones.
 *
 * Things already in place are reported as `present` rather than dropped, so
 * "what about Postgres?" has a visible answer instead of looking like flusk
 * failed to notice.
 */
import type { FluskConfig } from "../../platform/config/types.js";
import { CATALOG, type CatalogRow } from "./catalog.js";
import type { Advice, Evidence, RepoProfile, Suggestion } from "./types.js";

/** The MCP config block a user pastes. Written, never applied. */
function mcpApply(row: CatalogRow): { target: string; content: string } | undefined {
	if (row.pkg === undefined) return undefined;
	const key = row.id.replace(/^mcp:/, "");
	return {
		target: "~/.flusk/config.json  (mcpServers)",
		content: JSON.stringify(
			{ mcpServers: { [key]: { command: "npx", args: ["-y", row.pkg] } } },
			null,
			2,
		),
	};
}

/** A skill or agent is a markdown file; the frontmatter is the whole API. */
function fileApply(row: CatalogRow, profile: RepoProfile): { target: string; content: string } {
	const name = row.id.replace(/^(skill|agent):/, "");
	if (row.kind === "agent") {
		return {
			target: `<repo>/.flusk/agents/${name}.md`,
			content:
				`---\nname: ${name}\ndescription: ${row.title}\nworker: internal\n---\n\n` +
				`${row.rationale}\n\nVerify with: ${profile.verify.join(", ") || "(none detected)"}\n`,
		};
	}
	return {
		target: `<repo>/.flusk/skills/${name}.md`,
		content: `# ${row.title}\n\n${row.rationale}\n\nSteps:\n1. \n2. \n`,
	};
}

/** Every piece of evidence behind the signals a row needed. */
function evidenceFor(row: CatalogRow, profile: RepoProfile): Evidence[] {
	const all = [...profile.stack, ...profile.tooling, ...profile.services];
	const out: Evidence[] = [];
	for (const need of row.needs) {
		for (const d of all.filter((x) => x.name === need)) out.push(...d.evidence);
	}
	return out;
}

/** Names the profile detected, plus the synthetic ones the catalog asks about. */
function signalsOf(profile: RepoProfile): Set<string> {
	const names = new Set(
		[...profile.stack, ...profile.tooling, ...profile.services].map((d) => d.name),
	);
	if (profile.verify.length > 0) names.add("has-verify");
	return names;
}

/** True when this suggestion is already satisfied on disk or in config. */
function alreadyPresent(row: CatalogRow, profile: RepoProfile, cfg?: FluskConfig): boolean {
	if (row.kind === "mcp") {
		const key = row.id.replace(/^mcp:/, "");
		const servers = (cfg as unknown as { mcpServers?: Record<string, unknown> })?.mcpServers;
		return servers !== undefined && Object.hasOwn(servers, key);
	}
	if (row.kind === "skill" && row.id === "skill:verify") {
		// The rules documents are where a repo states what "done" means.
		return profile.docs.some((d) => d.kind === "rules");
	}
	return false;
}

export function advise(profile: RepoProfile, cfg?: FluskConfig): Advice {
	const have = signalsOf(profile);
	const suggestions: Suggestion[] = [];
	for (const row of CATALOG) {
		if (!row.needs.every((n) => have.has(n))) continue;
		const why = evidenceFor(row, profile);
		// A row that fired on a synthetic signal (has-verify) has no detection
		// evidence of its own; the verify commands ARE the evidence.
		const backing =
			why.length > 0
				? why
				: profile.verify.map((cmd) => ({ file: "package.json", note: `verify: ${cmd}` }));
		if (backing.length === 0) continue; // never emit an unevidenced suggestion
		const apply = row.kind === "mcp" ? mcpApply(row) : fileApply(row, profile);
		suggestions.push({
			kind: row.kind,
			id: row.id,
			title: row.title,
			rationale: row.rationale,
			why: backing,
			...(apply === undefined ? {} : { apply }),
			status: alreadyPresent(row, profile, cfg) ? "present" : "missing",
		});
	}
	// Missing first: the list is a worklist, and what is already done belongs
	// underneath it as an answer rather than on top of it as noise.
	suggestions.sort((a, b) => (a.status === b.status ? 0 : a.status === "missing" ? -1 : 1));
	return { profile, suggestions };
}
