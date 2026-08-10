/**
 * Publishing a night's work. Deliberately separate from the loop and OFF by
 * default (config `watch.push`): unattended runs stay local until the user
 * explicitly opts in to pushing branches and opening pull requests.
 */
import { spawnSync } from "node:child_process";
import type { WorkItem } from "./queue.js";

export interface PublishResult {
	pushed: boolean;
	url?: string;
	note: string;
}

function run(
	cmd: string,
	args: string[],
	cwd: string,
): { ok: boolean; out: string; err: string } {
	const r = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 120_000 });
	if (r.error !== undefined) return { ok: false, out: "", err: String(r.error) };
	return { ok: r.status === 0, out: r.stdout ?? "", err: r.stderr ?? "" };
}

const BODY_NOTE =
	"Opened by [hit](https://github.com/adirbenyossef/hit) running unattended. " +
	"Every commit is a per-turn checkpoint and the run passed its verification gate.";

/** Push the branch and open a PR for it. Never throws; reports what happened. */
export function publish(repoRoot: string, item: WorkItem, branch: string): PublishResult {
	const pushed = run("git", ["push", "-u", "origin", branch], repoRoot);
	if (!pushed.ok) return { pushed: false, note: `push failed: ${pushed.err.trim()}` };
	const pr = run(
		"gh",
		[
			"pr",
			"create",
			"--head",
			branch,
			"--title",
			`hit: ${item.title}`.slice(0, 120),
			"--body",
			`Working ${item.queue} item \`${item.key}\`.\n\n${BODY_NOTE}`,
		],
		repoRoot,
	);
	if (!pr.ok) return { pushed: true, note: `pushed; pr create failed: ${pr.err.trim()}` };
	const url = pr.out.trim().split("\n").pop() ?? "";
	return { pushed: true, url, note: `pushed and opened ${url}` };
}
