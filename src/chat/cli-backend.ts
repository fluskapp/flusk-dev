/**
 * Streaming from an agent CLI that is already installed and authenticated on
 * this machine. The whole conversation is rendered into ONE prompt argument
 * because that is the only interface these binaries agree on (`claude -p`,
 * `codex exec`, `kimi -p`): they are one-shot, stateless, and print to stdout.
 *
 * Contract, matching Provider: this never throws. A missing binary, a crash,
 * or a non-zero exit all arrive as an "error" chunk. The engine appends the
 * single "done".
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { ChatChunk, ChatMessage } from "./types.js";

const STDERR_TAIL = 2000;
const LABEL = { user: "User", assistant: "Assistant" } as const;

export interface CliRun {
	command: string;
	args: string[];
	prompt: string;
	cwd?: string | undefined;
}

/** Repo root: two levels up from src/chat (and from dist/chat once built). */
export function ahRepoRoot(): string {
	const dir = fileURLToPath(new URL("../..", import.meta.url));
	return dir.length > 1 && dir.endsWith("/") ? dir.slice(0, -1) : dir;
}

/** Labelled transcript, ending on the newest user turn — what a CLI answers. */
export function renderPrompt(messages: ChatMessage[]): string {
	let lastUser = -1;
	for (let i = 0; i < messages.length; i++) if (messages[i]?.role === "user") lastUser = i;
	const parts: string[] = [];
	messages.forEach((m, i) => {
		if (i !== lastUser) parts.push(`${LABEL[m.role]}: ${m.content}`);
	});
	const last = lastUser === -1 ? undefined : messages[lastUser];
	if (last !== undefined) parts.push(`${LABEL.user}: ${last.content}`);
	return parts.join("\n\n");
}

export async function* streamCli(run: CliRun, signal: AbortSignal): AsyncGenerator<ChatChunk> {
	const queue: ChatChunk[] = [];
	let wake: (() => void) | null = null;
	let closed = false;
	const push = (c: ChatChunk): void => {
		if (closed) return;
		queue.push(c);
		wake?.();
		wake = null;
	};
	const finish = (): void => {
		closed = true;
		wake?.();
		wake = null;
	};

	// detached: the child leads its own group, so a kill reaches the shells and
	// sleeps an agent CLI spawns — otherwise they hold the stdout pipe open.
	const child = spawn(run.command, [...run.args, run.prompt], {
		cwd: run.cwd ?? ahRepoRoot(),
		stdio: ["ignore", "pipe", "pipe"],
		detached: true,
	});
	const kill = (): void => {
		if (child.exitCode !== null || child.signalCode !== null) return;
		try {
			if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
		} catch {
			child.kill("SIGKILL");
		}
	};

	let stderr = "";
	let sawOutput = false;
	let aborted = false;
	child.stdout.on("data", (b: Buffer) => {
		sawOutput = true;
		push({ type: "delta", text: b.toString("utf8") });
	});
	child.stderr.on("data", (b: Buffer) => {
		stderr = (stderr + b.toString("utf8")).slice(-STDERR_TAIL);
	});
	child.on("error", (e: Error) => {
		push({ type: "error", message: `${run.command}: ${e.message}` });
		finish();
	});
	child.on("close", (code: number | null) => {
		// Output already delivered is an answer; only a silent failure is one.
		if (!aborted && code !== 0 && !sawOutput) {
			const tail = stderr.trim();
			push({
				type: "error",
				message: `${run.command} exited ${code ?? "?"}${tail ? `: ${tail}` : ""}`,
			});
		}
		finish();
	});
	const onAbort = (): void => {
		aborted = true;
		kill();
		finish();
	};
	signal.addEventListener("abort", onAbort, { once: true });
	if (signal.aborted) onAbort();

	try {
		for (;;) {
			const next = queue.shift();
			if (next !== undefined) {
				yield next;
				continue;
			}
			if (closed) return;
			await new Promise<void>((r) => {
				wake = r;
			});
		}
	} finally {
		signal.removeEventListener("abort", onAbort);
		kill();
		child.stdout.destroy();
		child.stderr.destroy();
	}
}
