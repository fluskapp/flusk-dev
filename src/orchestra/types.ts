/**
 * The orchestrator's frozen contract: how flusk delegates ONE task to ONE coding
 * agent that may not be flusk.
 *
 * Today delegation is src/tools/task.ts -> runSubagent, which can only build
 * another flusk loop on flusk's own provider. That is one worker out of three: this
 * machine already has `claude`, `codex` and `kimi` installed and
 * authenticated, and any OpenAI-compatible endpoint can drive flusk's own tool
 * loop. Without this seam every additional agent means another branch inside
 * the agent loop, and none of them return anything the verify gate can check.
 *
 * TYPES ONLY. The model layer is done: src/chat/types.ts owns transports,
 * credentials and streaming, and `AgentSpec.backendId` points AT a
 * `ChatBackend.id` rather than re-declaring any of it.
 *
 * Where specs come from — scope is derived from the directory the file was
 * found in, NEVER from anything the file itself claims:
 *   builtin    shipped inside flusk
 *   global     <flusk home>/agents/*.md            the user's own
 *   project    <repo>/.flusk/agents/*.md           authored by whatever was cloned
 *   generated  <flusk home>/agents/generated/*.md  written by flusk itself
 *
 * A spec is a PROMPT — markdown with frontmatter. Nothing ever eval()s it,
 * imports it, or runs it as a shell command. That is why a project-scoped
 * spec may load while `<repo>/.flusk/extensions/*.js` (arbitrary code) may not:
 * the untrusted layer contributes text, never execution. It contributes no
 * binary either — `backendId` resolves against `config.chat.backends`, which
 * src/config/config.ts already refuses from the project layer, so an
 * untrusted spec can only name a backend the user configured, and an id that
 * does not resolve makes the spec unavailable instead of guessing.
 */

/** Which machinery runs the task. Not which model — that is the backend. */
export type AgentWorkerKind =
	/** flusk's own loop (createAgent), the runSubagent path generalised. */
	| "internal"
	/** An installed agent CLI, spawned as a subprocess in a directory. */
	| "cli"
	/** An OpenAI-compatible endpoint driving flusk's own tool loop. */
	| "http";

/** Trust and provenance, in ascending order of who authored the file. */
export type AgentScope = "builtin" | "global" | "project" | "generated";

/** One delegable agent. Data only: a spec never carries behaviour. */
export interface AgentSpec {
	/** kebab-case, unique across the registry; the handle the caller names. */
	name: string;
	/**
	 * WHEN to use this agent, not what it is. This is the only field the
	 * router matches a task against, so a vague description is a routing bug.
	 */
	description: string;
	worker: AgentWorkerKind;
	/**
	 * `ChatBackend.id` from src/chat/types.ts. Required for "cli" and "http";
	 * ignored for "internal", which uses the parent run's provider.
	 */
	backendId?: string;
	/** Model id override within that backend; absent = the backend's default. */
	model?: string;
	/**
	 * ALLOW-list of tool names (`Tool.name`). Absent means the default set.
	 * Never a deny-list, and never additive: it can only narrow what the
	 * policy already permits, so a spec cannot hand itself a tool it is denied.
	 */
	tools?: string[];
	/** The system prompt. Text handed to a model — never code, never a command. */
	prompt: string;
	/** Absolute path the spec was loaded from; the identity used for reload. */
	source: string;
	scope: AgentScope;
}

/** One delegation. Everything a worker is allowed to know about the job. */
export interface WorkerTask {
	spec: AgentSpec;
	/** The task text, authored by the user or by the parent agent. */
	task: string;
	/**
	 * Absolute working directory, already proven to be a project root by
	 * src/safety/paths.ts. A worker writes here or under the flusk home, nowhere
	 * else, and never re-derives the jail with its own path logic.
	 */
	cwd: string;
	/** Aborting must kill child processes and in-flight requests, not detach. */
	signal: AbortSignal;
}

/**
 * The outcome of a delegation. A failure is a VALUE, never a throw: the
 * orchestrator has to keep running siblings and report which one failed.
 */
export interface WorkerResult {
	ok: boolean;
	/**
	 * What the agent did, for the parent's context and the harness journal.
	 * Non-empty even when ok is false. This is agent-authored text, so when it
	 * is fed back to a model it is delimited and labelled as a subagent
	 * result — it reports on work, it never redirects the caller.
	 */
	summary: string;
	/**
	 * Absolute paths written or deleted, deduped and sorted; empty array when
	 * nothing changed, never undefined. This is what the verify gate diffs
	 * against, so a worker that cannot tell reports [] rather than guessing.
	 */
	filesTouched: string[];
	/** Only when actually metered. Absent means unknown; 0 means known-free. */
	costUsd?: number;
	/** Present iff ok is false, and non-empty: why it failed, in one line. */
	error?: string;
}

/** Why a worker cannot run a spec, kept rather than hidden (see ChatBackend). */
export interface WorkerAvailability {
	ok: boolean;
	/** Required when ok is false: missing binary, unresolved backendId, no key. */
	reason?: string;
}

/** One way of running an agent. Every method is total — nothing throws. */
export interface Worker {
	kind: AgentWorkerKind;
	/** Probe only: never spawns the agent, never mutates the working tree. */
	available(spec: AgentSpec): Promise<WorkerAvailability>;
	/** Resolves with ok:false on failure, abort, or timeout. Never rejects. */
	run(task: WorkerTask): Promise<WorkerResult>;
}

/** A spec file that could not be loaded; surfaced, never swallowed. */
export interface SpecLoadIssue {
	/** Absolute path of the offending file, or the directory that was skipped. */
	source: string;
	reason: string;
}

/** The set of agents this repo can delegate to right now. */
export interface AgentRegistry {
	/** Deterministic order; includes specs whose worker is unavailable. */
	list(): AgentSpec[];
	/** undefined for an unknown name — an unknown agent is not an exception. */
	get(name: string): AgentSpec | undefined;
	/** Re-scans every scope. Returns what it refused; never throws. */
	reload(): Promise<SpecLoadIssue[]>;
}
