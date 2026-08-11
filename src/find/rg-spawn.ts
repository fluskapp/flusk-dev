/**
 * Running ripgrep: argv array, no shell, bounded by a timeout and killable by
 * an AbortSignal. The child leads its own process group (like
 * src/tools/bash.ts) so a kill reaches rg's own workers rather than orphaning
 * them to keep scanning a home directory after the request is gone.
 *
 * It never rejects. Missing rg, a bad glob, a timeout: the promise resolves
 * with a note the caller shows the user.
 */
import { spawn } from "node:child_process";

export const TIMEOUT_MS = 10_000;
/** Enough stderr to explain a failure; the rest is repetition. */
const STDERR_CAP = 4096;

/**
 * The line of rg's stderr that says WHY, not the header that says "something".
 *
 * `rg --json '['` prints four lines: "rg: regex parse error:", the pattern, a
 * caret, then "error: unclosed character class". Keeping only the first left
 * the Regex toggle's main failure mode reading "ripgrep failed: rg: regex
 * parse error:" — a sentence that ends exactly where it starts being useful.
 */
function why(stderr: string, code: number): string {
	const lines = stderr
		.trim()
		.split("\n")
		.filter((l) => l.trim() !== "");
	return lines.find((l) => /^\s*error:/.test(l))?.trim() ?? lines[0] ?? `exit ${code}`;
}

/**
 * Streams stdout line by line into `take`, which returns true to stop early.
 * Resolves with a note when the search failed or was cut short, else null.
 * `timeoutMs` is a parameter rather than a constant read inline so the kill
 * path can be exercised in a test without waiting ten seconds for it.
 */
export function runRg(
	args: string[],
	take: (line: string) => boolean,
	signal?: AbortSignal,
	timeoutMs: number = TIMEOUT_MS,
): Promise<string | null> {
	return new Promise((done) => {
		const child = spawn("rg", args, { detached: true, stdio: ["ignore", "pipe", "pipe"] });
		let buffer = "";
		let stderr = "";
		let note: string | null = null;
		let settled = false;
		// SIGKILL is not instant: rg's already-written bytes keep arriving as
		// further 'data' events. Without this the caller is handed matches it
		// asked us to stop at, and `total` overshoots the limit it set.
		let stopped = false;
		const kill = (): void => {
			try {
				if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
				else child.kill("SIGKILL");
			} catch {
				child.kill("SIGKILL"); // group already gone
			}
		};
		const onAbort = (): void => {
			note ??= "search aborted";
			kill();
		};
		const timer = setTimeout(() => {
			note ??= `search timed out after ${timeoutMs}ms`;
			kill();
		}, timeoutMs);
		const settle = (why: string | null): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			signal?.removeEventListener("abort", onAbort);
			done(why);
		};
		signal?.addEventListener("abort", onAbort, { once: true });
		if (signal?.aborted === true) onAbort();

		child.stderr.setEncoding("utf8");
		child.stderr.on("data", (c: string) => {
			// Capped: a root full of unreadable files makes rg print one warning
			// per file, and only the first few lines are ever read (see `why`).
			if (stderr.length < STDERR_CAP) stderr += c;
		});
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			if (stopped) return;
			buffer += chunk;
			for (let nl = buffer.indexOf("\n"); nl !== -1; nl = buffer.indexOf("\n")) {
				const line = buffer.slice(0, nl);
				buffer = buffer.slice(nl + 1);
				if (line !== "" && take(line)) {
					stopped = true;
					buffer = "";
					kill();
					return;
				}
			}
		});
		// ENOENT here is "ripgrep is not installed" — the one degradation that
		// costs the whole feature, so say so rather than answering zero.
		child.on("error", (e) => settle(`ripgrep unavailable: ${e.message}`));
		child.on("close", (code) => {
			// exit 1 is rg's "no matches", which is an answer, not a failure.
			if (note === null && code !== null && code > 1) {
				note = `ripgrep failed: ${why(stderr, code)}`;
			}
			settle(note);
		});
	});
}
