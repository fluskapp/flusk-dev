import { spawn } from "node:child_process";
import { Type } from "typebox";
import type { Tool, ToolContext, ToolResult } from "./tool.js";

const params = Type.Object({
	command: Type.String(),
	timeout_ms: Type.Optional(Type.Number()),
});

const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_CHARS = 30_000;
const TAIL_CHARS = 2_000;
/** After 'exit', how long to wait for stdio to flush before settling anyway. */
const EXIT_GRACE_MS = 200;

export const bashTool: Tool<typeof params> = {
	name: "bash",
	description:
		"Run a shell command via /bin/sh -c in the working directory. " +
		"Stdout and stderr are interleaved in arrival order. Default timeout 120000ms.",
	parameters: params,
	mode: "sequential",
	async execute(args, ctx) {
		const decision = ctx.policy.decide({ kind: "bash", command: args.command });
		if (!decision.allow) throw new Error(decision.reason);
		if (ctx.signal.aborted) throw new Error("aborted before execution");
		return run(args.command, args.timeout_ms ?? DEFAULT_TIMEOUT_MS, ctx);
	},
};

/**
 * Bounded output accumulator: middle-elision applied incrementally (head plus
 * rolling tail) so memory stays O(MAX_OUTPUT_CHARS) for verbose commands and
 * view() is always safe to emit.
 */
function makeCollector(maxChars: number) {
	const headBudget = Math.ceil(maxChars / 2);
	const tailBudget = Math.floor(maxChars / 2);
	let head = "";
	let tail = "";
	let elided = 0;
	return {
		push(chunk: string): void {
			if (head.length < headBudget) {
				const take = headBudget - head.length;
				head += chunk.slice(0, take);
				chunk = chunk.slice(take);
			}
			if (chunk.length === 0) return;
			tail += chunk;
			if (tail.length > tailBudget) {
				elided += tail.length - tailBudget;
				tail = tail.slice(tail.length - tailBudget);
			}
		},
		view(): string {
			if (elided === 0) return head + tail;
			return `${head}\n… [elided ${elided} chars] …\n${tail}`;
		},
	};
}

function run(command: string, timeoutMs: number, ctx: ToolContext): Promise<ToolResult> {
	return new Promise((resolve, reject) => {
		// detached: the child leads its own process group, so kills reach
		// grandchildren (pipelines, backgrounded commands) too.
		const child = spawn("/bin/sh", ["-c", command], { cwd: ctx.cwd, detached: true });
		const collector = makeCollector(MAX_OUTPUT_CHARS);
		let timedOut = false;
		let settled = false;
		let exitGrace: NodeJS.Timeout | undefined;

		const killGroup = () => {
			if (child.pid !== undefined) {
				try {
					process.kill(-child.pid, "SIGKILL");
					return;
				} catch {
					// group already gone; fall through to a direct kill
				}
			}
			child.kill("SIGKILL");
		};
		const timer = setTimeout(() => {
			timedOut = true;
			killGroup();
		}, timeoutMs);
		const onAbort = () => killGroup();
		ctx.signal.addEventListener("abort", onAbort, { once: true });
		// Close the race where abort fired between the execute() check and here.
		if (ctx.signal.aborted) onAbort();
		const cleanup = () => {
			clearTimeout(timer);
			if (exitGrace !== undefined) clearTimeout(exitGrace);
			ctx.signal.removeEventListener("abort", onAbort);
		};

		const collect = (chunk: Buffer) => {
			collector.push(chunk.toString("utf8"));
			ctx.onUpdate?.(collector.view());
		};
		child.stdout.on("data", collect);
		child.stderr.on("data", collect);

		const settle = (code: number | null, sig: NodeJS.Signals | null) => {
			if (settled) return;
			settled = true;
			cleanup();
			const capped = collector.view();
			if (timedOut) {
				const tail = capped.slice(-TAIL_CHARS);
				reject(new Error(`command timed out after ${timeoutMs}ms\noutput tail:\n${tail}`));
				return;
			}
			const exitCode = code ?? (sig ? 1 : 0);
			resolve({
				output: exitCode === 0 ? capped : `${capped}\n[exit code ${exitCode}]`,
				details: { exitCode },
			});
		};

		child.on("error", (err) => {
			if (settled) return;
			settled = true;
			cleanup();
			reject(new Error(`failed to spawn command: ${err.message}`));
		});
		// 'close' waits for the stdio pipes; a surviving grandchild can hold them
		// open forever, so also settle a grace period after 'exit'.
		child.on("close", settle);
		child.on("exit", (code, sig) => {
			exitGrace = setTimeout(() => {
				child.stdout.destroy();
				child.stderr.destroy();
				settle(code, sig);
			}, EXIT_GRACE_MS);
		});
	});
}
