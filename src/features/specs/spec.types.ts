/**
 * The spec feature's contract — the frozen seam every slice builds against.
 * A spec is a markdown file in the repo (`.flusk/specs/<name>.md`): the
 * frontmatter is the harness's half, the body is the author's.
 */

export type SpecStatus = "draft" | "planned" | "building" | "verifying" | "done";

/** How the run that serves this spec should be routed and prompted. */
export type SpecMode = "plan" | "architecture" | "refactor" | "build";

export interface SpecMeta {
	/** File stem: the handle `flusk run --spec <name>` takes. */
	name: string;
	title: string;
	status: SpecStatus;
	mode: SpecMode;
	/** Checklist the run's prompt carries and the gate is argued against. */
	acceptance: string[];
	/** Repo-relative path of the file. */
	path: string;
	updatedAt: string;
}

export interface Spec extends SpecMeta {
	/** The body below the frontmatter, verbatim. */
	body: string;
}

/** A parse that refused says why — an unreadable spec must not vanish. */
export interface SpecScan {
	specs: SpecMeta[];
	skipped: Array<{ path: string; why: string }>;
}

export const SPEC_DIR = ".flusk/specs";

export const SPEC_TEMPLATES = ["feature", "bugfix", "refactor"] as const;
export type SpecTemplate = (typeof SPEC_TEMPLATES)[number];

/** mode → routing kind: how a spec's intent becomes the router's vocabulary. */
export const MODE_KIND: Record<SpecMode, "plan" | "code" | "review"> = {
	plan: "plan",
	architecture: "plan",
	refactor: "code",
	build: "code",
};
