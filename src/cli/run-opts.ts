/**
 * The run command's option surface — split from run-cmd.ts so the dispatcher
 * stays under the size standard and the app's run manager can import the
 * shape without the machinery.
 */
import type { FluskConfig, RepoConfig, TaskKind } from "../platform/config/types.js";
import type { EventBus } from "../platform/events/events.js";

export interface RunCmdOpts {
	task: string;
	repo: string;
	/** Path to a JSON file with an array of ScriptedTurn entries. */
	fake?: string;
	/** Use the real provider. Without this and without `fake`, the demo script runs. */
	real?: boolean;
	/** "provider/id" override; skips the router. */
	model?: string;
	kind?: TaskKind;
	maxCostUsd?: number;
	deadlineMs?: number;
	maxTurns?: number;
	dry?: boolean;
	noIsolation?: boolean;
	allowDirty?: boolean;
	/** Skip the verification gate (commands and claim check) entirely. */
	noVerify?: boolean;
	quiet?: boolean;
	/** `--no-extensions`: run with the built-in toolbelt alone, for one command. */
	noExtensions?: boolean;
	/** Execute bash inside the repo's container (devcontainer image, or
	 * containers.image), against containers.context when set. */
	container?: boolean;
	out?: NodeJS.WritableStream;
	/** App-injected bus: the workbench wires its ring-buffer feed to this. */
	events?: EventBus;
	/** Hands the live agent to the caller (the workbench's steer/abort). */
	onAgent?: (agent: { steer(text: string): void; abort(): void }) => void;
	/**
	 * Config resolved by the caller, used INSTEAD of reading `<repo>/.flusk/config.json`.
	 * Unattended mode passes this because its `repo` is a worktree of a branch
	 * under review: a hostile `.flusk/config.json` there could otherwise disable the
	 * command classifier, add a verify command to execute, or redirect memory.
	 */
	trustedConfig?: { cfg: FluskConfig; repoConfig: RepoConfig | undefined; namespace?: string };
}
