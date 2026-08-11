/**
 * The "cli" worker: hand the job to a coding agent already installed and
 * authenticated on this machine (claude, codex, kimi) and let it edit files
 * IN the project directory.
 *
 * src/chat/cli-backend.ts already spawns these binaries one-shot, kills the
 * whole process group on abort, and reports a crash as data instead of
 * throwing; this reuses that spawn rather than growing a second one. What a
 * coding delegation adds is evidence: the agent's stdout is prose, so
 * filesTouched comes from the working tree (observe.ts), not from what the
 * agent claims it did.
 *
 * S4: the prompt is ONE argv element after the backend's configured args —
 * there is no shell, no command string, and nothing from the task is ever
 * concatenated into one. For the same reason `spec.model` is NOT translated
 * into a flag here: turning spec text into argv would let a spec smuggle
 * `--dangerously-skip-permissions` past the user. A backend that should run a
 * particular model says so in its own `args`, which only the user's config
 * can set.
 */
import { streamCli } from "../chat/cli-backend.js";
import type { AhConfig } from "../config/types.js";
import { specBackend } from "./backend.js";
import { snapshotTree, touchedSince } from "./observe.js";
import { delegationPrompt } from "./prompt.js";
import type { AgentSpec, Worker, WorkerAvailability, WorkerResult, WorkerTask } from "./types.js";

export function cliWorker(cfg: AhConfig): Worker {
	return {
		kind: "cli",
		// Probe only: a PATH lookup through the same detection the picker uses.
		// It never spawns the agent and never touches the working tree.
		available: async (spec: AgentSpec): Promise<WorkerAvailability> => probe(cfg, spec),
		run: async (task: WorkerTask): Promise<WorkerResult> => {
			try {
				return await runCli(cfg, task);
			} catch (e) {
				const error = e instanceof Error ? e.message : String(e);
				return {
					ok: false,
					summary: `${task.spec.name} crashed: ${error}`,
					filesTouched: [],
					error,
				};
			}
		},
	};
}

function probe(cfg: AhConfig, spec: AgentSpec): WorkerAvailability {
	if (spec.worker !== "cli") {
		return { ok: false, reason: `spec "${spec.name}" is worker "${spec.worker}", not "cli"` };
	}
	const look = specBackend(cfg, spec, "cli");
	return look.ok ? { ok: true } : { ok: false, reason: look.reason };
}

async function runCli(cfg: AhConfig, task: WorkerTask): Promise<WorkerResult> {
	if (task.spec.worker !== "cli") {
		return unavailable(task.spec, `spec is worker "${task.spec.worker}", not "cli"`);
	}
	const look = specBackend(cfg, task.spec, "cli");
	if (!look.ok) return unavailable(task.spec, look.reason);

	const before = snapshotTree(task.cwd);
	let text = "";
	let error: string | undefined;
	const run = {
		command: look.backend.config.command ?? task.spec.backendId ?? "",
		args: look.backend.args,
		prompt: delegationPrompt(task.spec, task.task),
		// The child's working directory IS the jail: it inherits cwd and no
		// caller-supplied path is passed through to it.
		cwd: task.cwd,
	};
	for await (const chunk of streamCli(run, task.signal)) {
		if (chunk.type === "delta") text += chunk.text;
		else if (chunk.type === "error") error = chunk.message;
	}
	const filesTouched = touchedSince(task.cwd, before);
	if (task.signal.aborted) {
		return { ok: false, summary: `${task.spec.name} aborted`, filesTouched, error: "aborted" };
	}
	if (error !== undefined) {
		return { ok: false, summary: `${task.spec.name} failed: ${error}`, filesTouched, error };
	}
	const body = text.trim() === "" ? `${run.command} produced no output` : text.trim();
	return { ok: true, summary: body, filesTouched };
}

function unavailable(spec: AgentSpec, reason: string): WorkerResult {
	return {
		ok: false,
		summary: `${spec.name} was not run: ${reason}`,
		filesTouched: [],
		error: reason,
	};
}
