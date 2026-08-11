/**
 * One iteration of unattended mode: pick the oldest eligible item, work it in
 * its own worktree, and record what happened. Every side effect goes through
 * an injected dependency so the whole policy is testable without gh, git, or
 * a model.
 */
import type { CliOutcome } from "../cli/gate-loop.js";
import type { AhConfig } from "../config/types.js";
import type { FactStore } from "../store/types.js";
import {
	cooldownUntil,
	extendCooldown,
	failureCount,
	isCoolingDown,
	nightCount,
	nightKey,
	recordAttempt,
	recordNightRun,
	recordOutcome,
} from "./ledger.js";
import type { PollResult, WorkItem } from "./queue.js";

export interface WatchDeps {
	repoRoot: string;
	client: FactStore;
	cfg: AhConfig;
	now(): number;
	log(line: string): void;
	poll(): PollResult;
	/** Work the item inside `dir`; resolves with the CLI outcome. */
	runItem(item: WorkItem, dir: string): Promise<CliOutcome>;
	openWorktree(item: WorkItem): { dir: string; cleanup(): void };
	/** Called only when the run completed and `watch.push` is on. */
	publish(item: WorkItem, dir: string): void;
}

export type TickStatus = "ran" | "idle" | "night-cap";

export interface TickResult {
	status: TickStatus;
	item?: WorkItem;
	outcome?: CliOutcome;
}

export async function watchTick(deps: WatchDeps): Promise<TickResult> {
	const { cfg, client } = deps;
	const nowMs = deps.now();
	const date = nightKey(nowMs);
	const count = await nightCount(client, date);
	if (count >= cfg.watch.maxRunsPerNight) {
		deps.log(`night cap reached (${count}/${cfg.watch.maxRunsPerNight}) — holding`);
		return { status: "night-cap" };
	}

	const polled = deps.poll();
	for (const n of polled.notes) deps.log(n);

	// Oldest first, sorted here rather than trusted from the poller: starvation
	// resistance is this loop's guarantee, not the queue's.
	const queue = [...polled.items].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
	let chosen: WorkItem | undefined;
	for (const item of queue) {
		if (await isCoolingDown(client, item.key, nowMs)) continue;
		chosen = item;
		break;
	}
	if (chosen === undefined) {
		deps.log(`nothing eligible (${queue.length} item(s) polled, all resting)`);
		return { status: "idle" };
	}

	const failures = await failureCount(client, chosen.key);
	// Ledger first: a crash mid-run must still leave a cooldown behind.
	await recordNightRun(client, date, chosen.key, nowMs);
	await recordAttempt(
		client,
		chosen.key,
		nowMs,
		cooldownUntil(nowMs, cfg.watch.cooldownHours, cfg.watch.failCooldownHours, failures),
	);
	deps.log(`working ${chosen.key}: ${chosen.title}`);

	// Opening the worktree is inside the guarded region: it throws when a
	// branch from an earlier attempt still exists, and an unguarded throw here
	// would end the entire night on one bad item.
	let wt: { dir: string; cleanup(): void } | undefined;
	let outcome: CliOutcome = "error";
	try {
		wt = deps.openWorktree(chosen);
		outcome = await deps.runItem(chosen, wt.dir);
	} catch (e) {
		deps.log(`run failed to start or threw: ${e instanceof Error ? e.message : String(e)}`);
	} finally {
		// Always reclaim the checkout, even if a post-run step throws below.
		wt?.cleanup();
	}
	await recordOutcome(client, chosen.key, outcome, failures);

	if (outcome === "completed") {
		if (cfg.watch.push && wt !== undefined) deps.publish(chosen, wt.dir);
	} else {
		// Back off harder each time this item fails.
		await extendCooldown(
			client,
			chosen.key,
			cooldownUntil(nowMs, cfg.watch.cooldownHours, cfg.watch.failCooldownHours, failures + 1),
		);
	}
	deps.log(`${chosen.key} → ${outcome}`);
	return { status: "ran", item: chosen, outcome };
}
