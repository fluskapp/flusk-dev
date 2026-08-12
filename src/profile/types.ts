/**
 * What flusk knows about a repository after looking at it, and what it thinks
 * would help. Frozen contract.
 *
 * The rule the whole feature turns on: EVERY claim carries the file that
 * supports it. A tool that says "you should install the Postgres MCP" without
 * saying "because package.json depends on pg and compose.yml runs a postgres
 * service" is a tool that will eventually recommend something plausible and
 * wrong, and the reader has no way to tell which time this is. Evidence is
 * therefore non-optional in the types, not a nicety a caller may skip.
 *
 * Nothing here applies anything. A suggestion carries the exact text to add
 * and where it goes; installing an MCP server, writing a skill or trusting a
 * project stays a decision the user makes.
 */

/** Why flusk believes something, pointing at a file the reader can open. */
export interface Evidence {
	/** Repo-relative path — an absolute one leaks the reader's home dir. */
	file: string;
	/** What was found there, in a few words: "depends on pg", "postgres:16". */
	note: string;
}

export type DetectedKind =
	/** A language the repo is written in. */
	| "language"
	/** A runtime or package manager it needs. */
	| "runtime"
	/** A framework or major library it is built on. */
	| "framework"
	/** Something the repo runs on itself: test runner, linter, formatter. */
	| "tool"
	/** Something external it talks to: a database, a queue, an API. */
	| "service";

export interface Detected {
	/** Canonical lowercase id: "typescript", "postgres", "vitest". */
	name: string;
	kind: DetectedKind;
	/** Never empty. A detection with no evidence is a guess. */
	evidence: Evidence[];
}

/** One document worth knowing about, with enough to decide whether to open it. */
export interface DocEntry {
	/** Repo-relative path. */
	file: string;
	/** First heading, or the filename when the document has none. */
	title: string;
	/**
	 * Documents that state HOW TO WORK in this repo — AGENTS.md, CLAUDE.md,
	 * CONTRIBUTING.md — as opposed to documents about the product. The agent
	 * reads the first kind; a human reads both.
	 */
	kind: "rules" | "readme" | "doc";
	bytes: number;
}

export interface RepoProfile {
	/** Absolute root, the one path that is not repo-relative. */
	root: string;
	stack: Detected[];
	tooling: Detected[];
	services: Detected[];
	docs: DocEntry[];
	/** Commands that constitute verification, from src/verify/detect.ts. */
	verify: string[];
	/** Files flusk could not read; kept so a partial profile says it is partial. */
	unreadable: string[];
}

export type SuggestionKind =
	/** An MCP server that would give the agent a capability it lacks. */
	| "mcp"
	/** A repeatable procedure in this repo worth writing down. */
	| "skill"
	/** An agent specification for work this repo keeps needing. */
	| "agent"
	/** A verification command flusk found but is not configured to run. */
	| "verify";

export interface Suggestion {
	kind: SuggestionKind;
	/** Stable id, "mcp:postgres" — so a dismissal can be remembered. */
	id: string;
	title: string;
	/** One sentence: what this gives you that you do not have. */
	rationale: string;
	/** NEVER empty. The contract of this whole module. */
	why: Evidence[];
	/**
	 * The exact thing to add, and where. Absent when the action is not a file
	 * edit (installing a binary), in which case `rationale` says what to do.
	 */
	apply?: { target: string; content: string };
	/**
	 * "present" when the repo or config already has this. Kept in the list
	 * rather than filtered out, so the answer to "what about X?" is visible
	 * instead of looking like an oversight.
	 */
	status: "missing" | "present";
}

export interface Advice {
	profile: RepoProfile;
	suggestions: Suggestion[];
}
