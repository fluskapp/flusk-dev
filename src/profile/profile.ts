/**
 * Building the whole picture of a repository: what it is made of, what it
 * documents, and how it is verified.
 *
 * Verification is not re-derived here — src/verify/detect.ts already decides
 * what counts as a verify command for this repo, and a second opinion in a
 * second file is how the gate and the advice start disagreeing about what
 * "done" means.
 */
import { detectVerifyCommands } from "../verify/detect.js";
import { detectAll } from "./detect.js";
import { gatherDocs } from "./docs.js";
import { readManifests } from "./manifests.js";
import type { RepoProfile } from "./types.js";

export function buildProfile(root: string): RepoProfile {
	const manifests = readManifests(root);
	const all = detectAll(root, manifests);
	let verify: string[] = [];
	try {
		verify = detectVerifyCommands(root);
	} catch {
		// A profile is worth having without it; the advisor treats an empty
		// verify list as "nothing declared", which is itself a finding.
	}
	return {
		root,
		stack: all.filter((d) => d.kind === "language" || d.kind === "runtime" || d.kind === "framework"),
		tooling: all.filter((d) => d.kind === "tool"),
		services: all.filter((d) => d.kind === "service"),
		docs: gatherDocs(root),
		verify,
		unreadable: manifests.unreadable,
	};
}
