import { spawnSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { assistantText, assistantToolCalls } from "../src/provider/fake.js";

// Git-heavy tests spawn many subprocesses; sandboxed CI machines can take
// seconds per spawn, so give every test (and the hooks) generous room.
export const SLOW = 120_000;

export function capture(): { out: PassThrough; text: () => string } {
	const out = new PassThrough();
	let text = "";
	out.on("data", (chunk: Buffer) => {
		text += chunk.toString("utf8");
	});
	return { out, text: () => text };
}

export function git(cwd: string, ...args: string[]): string {
	const res = spawnSync("git", args, { cwd, encoding: "utf8" });
	if (res.status !== 0) throw new Error(`git ${args.join(" ")}: ${res.stderr}`);
	return res.stdout;
}

export async function initGitRepo(dir: string): Promise<void> {
	git(dir, "init", "-q");
	git(dir, "config", "user.email", "test@example.com");
	git(dir, "config", "user.name", "test");
	await writeFile(join(dir, "README.md"), "scratch\n");
	git(dir, "add", "-A");
	git(dir, "commit", "-q", "-m", "init");
}

/** Two-turn fake script: one bash call, then a text wrap-up. */
export async function writeFakeScript(path: string, command: string): Promise<string> {
	const script = [
		{ message: assistantToolCalls([{ id: "c1", name: "bash", args: { command } }]) },
		{ message: assistantText("all done") },
	];
	await writeFile(path, JSON.stringify(script));
	return path;
}
