/**
 * `hit watch` — unattended mode. Wires the real dependencies (gh queues, git
 * worktrees, runCmd, the abagraph ledger) into the injectable watch loop.
 *
 * Memory is REQUIRED here: the attempt ledger and cooldowns are facts, and
 * without them an overnight loop would retry the same item forever.
 */
import { loadConfig, loadRepoConfig } from "../config/config.js";
import { createMemory } from "../memory/bootstrap.js";
import { resolveNamespace } from "../memory/namespaces.js";
import { repoSlug } from "../session/paths.js";
import { watchLoop } from "../watch/loop.js";
import { branchFor, createWorktree, currentBranch, removeWorktree } from "../watch/isolation.js";
import { observeRun } from "../watch/observe.js";
import { publish } from "../watch/push.js";
import { pollQueues } from "../watch/queue.js";
import type { RunItemResult } from "../watch/tick.js";
import { runCmd } from "./run-cmd.js";

export interface WatchCmdOpts {
	repo: string;
	/** Run a single tick and stop (a dry-ish smoke of the whole path). */
	once?: boolean;
	maxTicks?: number;
	out?: NodeJS.WritableStream;
}

const sleep = (ms: number): Promise<void> =>
	new Promise((r) => {
		setTimeout(r, ms).unref?.();
	});

export async function watchCmd(opts: WatchCmdOpts): Promise<number> {
	const out = opts.out ?? process.stdout;
	const cfg = loadConfig(opts.repo);
	const repoConfig = loadRepoConfig(opts.repo);
	const { client } = await createMemory(cfg, opts.repo, repoConfig);
	if (client === null) {
		process.stderr.write(
			"hit watch needs memory: the attempt ledger lives in abagraph, and without it " +
				"an unattended loop would retry the same item forever.\n" +
				"Start abagraph (or set memory.baseUrl in ~/.hit/config.json) and try again.\n",
		);
		return 1;
	}
	const repoNs = resolveNamespace(opts.repo, repoConfig);
	const slug = repoSlug(opts.repo);
	const log = (line: string): void => {
		out.write(`watch · ${line}\n`);
	};

	log(
		`queues ${cfg.watch.queues.join(", ")} · max ${cfg.watch.maxRunsPerNight}/night · ` +
			`$${cfg.watch.maxCostUsdPerRun}/run · push ${cfg.watch.push ? "on" : "off"}`,
	);

	const summary = await watchLoop(
		{
			repoRoot: opts.repo,
			repoNs,
			repoSlug: slug,
			client,
			cfg,
			now: () => Date.now(),
			log,
			poll: () => pollQueues(opts.repo, cfg.watch.queues),
			openWorktree: (item) => {
				const wt = createWorktree(
					opts.repo,
					branchFor(cfg.isolation.branchPrefix, item.key),
					item.ref,
				);
				return { dir: wt.dir, cleanup: () => removeWorktree(opts.repo, wt) };
			},
			runItem: async (item, dir): Promise<RunItemResult> => {
				const startedAt = new Date().toISOString();
				const outcome = await runCmd({
					task: item.task,
					repo: dir,
					real: true,
					maxCostUsd: cfg.watch.maxCostUsdPerRun,
					deadlineMs: cfg.watch.maxRunMinutes * 60_000,
					quiet: true,
					out,
					// The worktree holds a branch under review: never read config
					// from it, and keep memory in the main repo's namespace so
					// what the run learns is still there tomorrow.
					trustedConfig: { cfg, repoConfig, namespace: repoNs },
				});
				const seen = await observeRun(client, repoNs, startedAt);
				return { outcome, runId: seen.runId, verdict: seen.verdict };
			},
			publish: (item, dir) => {
				const branch = currentBranch(dir);
				if (branch === "") return log("no branch to publish");
				log(publish(opts.repo, item, branch).note);
			},
		},
		{
			sleep,
			...(opts.once === true ? { maxTicks: 1 } : {}),
			...(opts.maxTicks !== undefined ? { maxTicks: opts.maxTicks } : {}),
		},
	);

	log(`stopped after ${summary.ticks} tick(s): ${summary.completed}/${summary.ran} completed`);
	return 0;
}
