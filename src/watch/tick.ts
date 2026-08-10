/**
 * One iteration of unattended mode: pick the oldest eligible item, work it in
 * its own worktree, and record what happened. Every side effect goes through
 * an injected dependency so the whole policy is testable without gh, git, or
 * a model.
 */
import type { MemVerdict, MemoryClient } from "../memory/client-types.js";
import type { CliOutcome } from "../cli/gate-loop.js";
import type { HitConfig } from "../config/types.js";
import {
	bumpNightCount,
	cooldownUntil,
	extendCooldown,
	failureCount,
	isCoolingDown,
	nightCount,
	nightKey,
	recordAttempt,
	recordOutcome,
} from "./ledger.js";
import { promoteLessons } from "./promote.js";
import type { PollResult, WorkItem } from "./queue.js";

export interface RunItemResult {
	outcome: CliOutcome;
	runId: string;
	verdict?: MemVerdict;
}

export interface WatchDeps {
	repoRoot: string;
	repoNs: string;
	repoSlug: string;
	client: MemoryClient;
	cfg: HitConfig;
	now(): number;
	log(line: string): void;
	poll(): PollResult;
	/** Work the item inside `dir`; resolves with the CLI outcome. */
	runItem(item: WorkItem, dir: string): Promise<RunItemResult>;
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
	await recordAttempt(
		client,
		chosen.key,
		nowMs,
		cooldownUntil(nowMs, cfg.watch.cooldownHours, cfg.watch.failCooldownHours, failures),
	);
	await bumpNightCount(client, date, count);
	deps.log(`working ${chosen.key}: ${chosen.title}`);

	const wt = deps.openWorktree(chosen);
	let result: RunItemResult;
	try {
		result = await deps.runItem(chosen, wt.dir);
	} catch (e) {
		result = { outcome: "error", runId: "", verdict: undefined };
		deps.log(`run threw: ${e instanceof Error ? e.message : String(e)}`);
	}
	await recordOutcome(client, chosen.key, result.outcome, failures);

	if (result.outcome === "completed") {
		const promo = await promoteLessons(
			client,
			deps.repoNs,
			deps.repoSlug,
			result.runId,
			result.verdict ?? "WARN",
		);
		if (promo.promoted > 0) deps.log(`promoted ${promo.promoted} lesson(s)`);
		if (cfg.watch.push) deps.publish(chosen, wt.dir);
	} else {
		// Back off harder each time this item fails.
		await extendCooldown(
			client,
			chosen.key,
			cooldownUntil(nowMs, cfg.watch.cooldownHours, cfg.watch.failCooldownHours, failures + 1),
		);
	}
	wt.cleanup();
	deps.log(`${chosen.key} → ${result.outcome}`);
	return { status: "ran", item: chosen, outcome: result.outcome };
}
