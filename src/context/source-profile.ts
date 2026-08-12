/**
 * The repo-profile ContextSource: what this repository is built from, before
 * the first turn.
 *
 * Without it a run opens knowing the task and nothing about the ground it
 * stands on — it will propose jest in a vitest repo and eslint in a biome one,
 * and every such guess costs a turn to discover and a turn to undo. buildProfile
 * already answers this from root manifests; nothing joined it to a run's
 * context. This is that join, and it adds no detection of its own: a second
 * detector would disagree with src/profile/detect.ts and nobody would be
 * watching the wrong one.
 *
 * Cost, and the reason this source is safe to run at run start: ONE bounded
 * pass over the repo root — up to a dozen manifest reads, two readdirs for
 * markdown, one .git read to resolve a worktree. No recursion, no spawn, no
 * network. A source that stalls the run start is worse than one that returns
 * less, so nothing here grows with repo size.
 *
 * gather is TOTAL (L7). buildProfile's readers are already total, but a
 * profiler that throws for a reason not yet imagined must still cost the run
 * items and a stated reason rather than the run.
 *
 * The statuses mean exactly this:
 * - "skipped": no manifest, no markdown — there is nothing here to profile.
 * - "partial": something was unreadable, or a group hit GROUP_CAP; either way
 *   the block is thinner than the repo, and a note says which (L2).
 * - "failed": buildProfile threw. Items are empty, the reason is stated.
 */
import { buildProfile } from "../profile/profile.js";
import type { RepoProfile } from "../profile/types.js";
import {
	type DetectedGroup,
	detectedItem,
	docsItem,
	GROUP_CAP,
	PROFILE_SOURCE,
	sortDetected,
} from "./source-profile-items.js";
import type { ContextItem, ContextRequest, ContextSource, SourceResult } from "./types.js";

const reason = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Fixed group order: services first, because an external service changes what a task even means. */
const GROUPS: DetectedGroup[] = ["services", "stack", "tooling"];

const listOf = (p: RepoProfile, g: DetectedGroup): (typeof p.stack)[number][] =>
	g === "services" ? p.services : g === "stack" ? p.stack : p.tooling;

/** Docs are pointers; more than this is a directory listing, not orientation. */
const DOCS_CAP = GROUP_CAP;

function gather(req: ContextRequest): SourceResult {
	let profile: RepoProfile;
	try {
		profile = buildProfile(req.repoRoot);
	} catch (err) {
		return {
			items: [],
			status: "failed",
			notes: [
				`Repo profile could not be built (${reason(err)}), so this run has no stack orientation.`,
			],
		};
	}

	const notes: string[] = [];
	const items: ContextItem[] = [];
	// Sorted, because unreadable is filled in read order and a note list that
	// permutes is a block that permutes (L5).
	for (const file of [...profile.unreadable].sort()) {
		notes.push(`${file} could not be parsed, so anything it declares is missing from this block.`);
	}

	for (const g of GROUPS) {
		const sorted = sortDetected(listOf(profile, g));
		const kept = sorted.slice(0, GROUP_CAP);
		if (sorted.length > kept.length) {
			notes.push(
				`${sorted.length - kept.length} further ${g} detections were dropped at the ${GROUP_CAP}-item cap.`,
			);
		}
		const built = detectedItem(g, kept, req.task);
		if (built !== null) items.push(built);
	}

	const docs = profile.docs.slice(0, DOCS_CAP);
	if (profile.docs.length > docs.length) {
		notes.push(
			`${profile.docs.length - docs.length} further documents were dropped at the ${DOCS_CAP}-pointer cap.`,
		);
	}
	const docsBlock = docsItem(docs, req.task);
	if (docsBlock !== null) items.push(docsBlock);

	if (items.length === 0 && notes.length === 0) {
		return {
			items,
			status: "skipped",
			notes: [
				"No root manifest and no markdown at the repo root or in docs/: there is nothing here to profile.",
			],
		};
	}
	return { items, status: notes.length === 0 ? "ok" : "partial", notes };
}

/**
 * Registered by the assembler. `label` is what the report calls it; the id is
 * the trust key — profile items are quoted repo data and the assembler
 * delimits them, so nothing here wraps its own body (L3).
 */
export const profileSource: ContextSource = {
	id: PROFILE_SOURCE,
	label: "Repo profile",
	gather,
};
