/**
 * `flusk watch` — unattended mode. Wires the real dependencies (gh queues, git
 * worktrees, runCmd, the attempt ledger) into the injectable watch loop.
 *
 * The ledger is REQUIRED here: attempts and cooldowns are facts, and without
 * them an overnight loop would retry the same item forever. `memory.enabled:
 * false` asks flusk to leave no trace, which for an unattended loop is not a
 * degraded mode but an unbounded one — so this command refuses to start
 * instead of running without a record.
 */
import { loadConfig, loadRepoConfig } from "../config/config.js";
import { repoSlug } from "../session/paths.js";
import { FLUSK_NS, resolveNamespace } from "../store/namespaces.js";
import { createFactStore } from "../store/store.js";
import { sweepTransient } from "../store/sweep.js";
import {
	branchFor,
	commitCount,
	createWorktree,
	currentBranch,
	removeWorktree,
} from "../watch/isolation.js";
import { watchLoop } from "../watch/loop.js";
import { publish } from "../watch/push.js";
import { pollQueues } from "../watch/queue.js";
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
	if (!cfg.memory.enabled) {
		out.write("flusk watch needs the fact store: it is the only bound on retries.\n");
		out.write("Set memory.enabled to true, or run `flusk run` for a single unrecorded run.\n");
		return 1;
	}
	const store = createFactStore();
	const repoNs = resolveNamespace(opts.repo, repoConfig);
	const slug = repoSlug(opts.repo);
	const log = (line: string): void => {
		out.write(`watch · ${line}\n`);
	};
	// Cooldowns are the ledger's ephemera: expired ones answer no question and
	// the log they sit in is read whole on every tick. Once per session, at the
	// one moment no tick is in flight.
	await sweepTransient(FLUSK_NS).catch(() => undefined);

	log(
		`queues ${cfg.watch.queues.join(", ")} · max ${cfg.watch.maxRunsPerNight}/night · ` +
			`$${cfg.watch.maxCostUsdPerRun}/run · push ${cfg.watch.push ? "on" : "off"}`,
	);

	const summary = await watchLoop(
		{
			repoRoot: opts.repo,
			client: store,
			cfg,
			now: () => Date.now(),
			log,
			poll: () => pollQueues(opts.repo, cfg.watch.queues, slug),
			openWorktree: (item) => {
				const wt = createWorktree(
					opts.repo,
					branchFor(cfg.isolation.branchPrefix, item.key),
					item.ref,
				);
				return { dir: wt.dir, cleanup: () => removeWorktree(opts.repo, wt) };
			},
			runItem: async (item, dir) =>
				runCmd({
					task: item.task,
					repo: dir,
					real: true,
					maxCostUsd: cfg.watch.maxCostUsdPerRun,
					deadlineMs: cfg.watch.maxRunMinutes * 60_000,
					quiet: true,
					out,
					// The worktree holds a branch under review: never read config
					// from it, and keep the run's facts in the main repo's
					// namespace so what it learns is still there tomorrow.
					trustedConfig: { cfg, repoConfig, namespace: repoNs },
				}),
			publish: (item, dir) => {
				const branch = currentBranch(dir);
				if (branch === "") return log("no branch to publish");
				const base = item.ref ?? "HEAD";
				const hasCommits = commitCount(opts.repo, branch, base) > 0;
				log(publish(opts.repo, item, branch, { hasCommits, ...(item.ref !== undefined ? { base: item.ref } : {}) }).note);
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
