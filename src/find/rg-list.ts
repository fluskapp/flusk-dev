/**
 * `rg --files` for one root, ASYNCHRONOUSLY.
 *
 * This used to be an `execFileSync` on the request path, so every cold
 * Go-to-File call blocked Node's single thread for the whole walk — nearly
 * three seconds against a ten-root config here, and up to timeout × roots in
 * the worst case — freezing every other tab, the SSE chat stream and the
 * status polls with it.
 *
 * The child leads its own process group (like rg-spawn.ts) so the timeout
 * kill reaches rg's workers instead of orphaning them, and it never rejects:
 * a missing rg, a vanished root or a timeout is an empty listing, which is
 * exactly what the caller can act on.
 */
import { spawn } from "node:child_process";

/** Long enough for a monorepo, short enough that a stuck root is not forever. */
const LIST_TIMEOUT_MS = 5_000;
/** Output kept per root; past this the listing is already unusably long. */
const MAX_BYTES = 32 * 1024 * 1024;

export function rgFiles(root: string): Promise<string[]> {
	return new Promise((done) => {
		const child = spawn("rg", ["--files", "--", root], {
			detached: true,
			stdio: ["ignore", "pipe", "ignore"],
		});
		let out = "";
		let settled = false;
		const kill = (): void => {
			try {
				if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
				else child.kill("SIGKILL");
			} catch {
				child.kill("SIGKILL"); // group already gone
			}
		};
		const timer = setTimeout(kill, LIST_TIMEOUT_MS);
		const settle = (files: string[]): void => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			done(files);
		};
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => {
			if (out.length >= MAX_BYTES) {
				kill();
				return;
			}
			out += chunk;
		});
		// ENOENT here is "ripgrep is not installed": an empty listing, never a throw.
		child.on("error", () => settle([]));
		child.on("close", () => settle(out.split("\n").filter((l) => l !== "")));
	});
}
