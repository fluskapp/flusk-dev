/**
 * The run-configuration feature's contract — the frozen seam the dialog, the
 * toolbar runner widget and the launcher all build against. A run
 * configuration is a committable JSON file, `.flusk/runs/<name>.json` in the
 * repo (project scope) shadowing `~/.flusk/runs/<name>.json` (global scope)
 * by name — the workspace-layer precedent. The spec owns WHAT to run; a
 * configuration owns HOW.
 */

/** Where a config file lives; a project file shadows a global one by name. */
export type RunConfigScope = "project" | "global";

/** The routing kinds `flusk run --kind` takes; absent = spec mode or classifier. */
export type RunConfigKind = "plan" | "code" | "review" | "summarize";

export interface RunConfigBudgets {
	/** Dollar cap for the run (`--max-cost`). */
	maxCostUsd?: number;
	/** Wall-clock cap in the run-args duration grammar: "2h", "30m", "1h30m". */
	for?: string;
	/** Turn cap (`--max-turns`). */
	maxTurns?: number;
}

export interface RunConfigIsolation {
	/** `--no-isolation`: run on the current branch, no run branch. */
	none?: boolean;
	/** `--allow-dirty`: skip the clean-tree check. */
	allowDirty?: boolean;
	/** `--container`: execute bash inside the repo's container. */
	container?: boolean;
}

/** One `.flusk/runs/<name>.json`, field for field. `name` is the file stem —
 * the `--spec <name>` idiom — so it never appears inside the file. */
export interface RunConfig {
	/** v1 discriminant; the dialog's left-list grouping. */
	type: "task";
	/** Exactly one of task | spec is required: the literal task text… */
	task?: string;
	/** …or the spec that IS the task (`flusk run --spec` semantics). */
	spec?: string;
	/** Repo to run in; default = the caller's repo. Must be a configured project root. */
	repo?: string;
	kind?: RunConfigKind;
	/** "provider/id" router override; absent = the router decides. */
	model?: string;
	budgets?: RunConfigBudgets;
	/** Default true; false = `--no-verify`. */
	verify?: boolean;
	/** Harness id from .flusk/harnesses (or "native"); absent = native. */
	harness?: string;
	isolation?: RunConfigIsolation;
	/** Scripted-provider JSON path — demo/test configs, the `--fake` precedent. */
	fake?: string;
	tags?: string[];
}

export interface RunConfigMeta extends RunConfig {
	name: string;
	scope: RunConfigScope;
	/** Project scope: repo-relative (committable). Global scope: absolute. */
	path: string;
}

/** A scan that refused a file says why — an unreadable config must not
 * vanish from the dialog; it appears greyed with its reason. */
export interface RunConfigScan {
	configs: RunConfigMeta[];
	skipped: Array<{ path: string; why: string }>;
}

/** The red-line idiom as data: errors disable Run/Save, warnings block nothing. */
export interface RunConfigIssue {
	level: "error" | "warning";
	message: string;
}

/** A write's answer: where it landed, or the refusal. */
export type RunConfigWriteReply = { ok: true; path: string } | { ok: false; why: string };

/** What launching a config returns to the runner widget. */
export type LaunchReply = { ok: true; runId: string; task: string } | { ok: false; why: string };

/** The dry preview: the composed plan text, or the refusal. */
export type DryReply = { ok: true; plan: string } | { ok: false; why: string };

export const RUN_DIR = ".flusk/runs";
