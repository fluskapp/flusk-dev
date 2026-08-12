/**
 * Shared fixtures for the watch-policy suites: a fake work queue, a fake
 * runner, and a throwaway fact store, so every side effect the loop has is
 * observable without gh, git, or a model.
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_CONFIG } from "../src/platform/config/defaults.js";
import type { FluskConfig } from "../src/platform/config/types.js";
import { createFactStore } from "../src/features/facts/facts.repository.js";
import type { FactStore } from "../src/features/facts/types.js";
import type { CliOutcome } from "../src/cli/gate-loop.js";
import type { WorkItem } from "../src/features/watch/queue.repository.js";
import type { WatchDeps } from "../src/features/watch/tick.js";

export const REPO_NS = "repo:watch-test";
/** Anchored to real time: the store stamps facts with the wall clock, so a
 * fixed synthetic instant would put `asOf` reads before the facts exist. */
export const T0 = Date.now();
export const HOUR = 3_600_000;

export const item = (key: string, updatedAt: string): WorkItem => ({
	key,
	queue: "gh-prs",
	title: `item ${key}`,
	updatedAt,
	task: `work ${key}`,
});

export interface Harness {
	deps: WatchDeps;
	log: string[];
	ran: WorkItem[];
	published: WorkItem[];
	cleanups: number;
	now: number;
	result: CliOutcome;
	/** Makes the fake runner throw instead of returning `result`. */
	explodes: boolean;
	items: WorkItem[];
}

/** A fact store over its own temp directory, plus the way to delete it. */
export async function startMemory(): Promise<{ store: FactStore; cleanup(): Promise<void> }> {
	const dir = await mkdtemp(join(tmpdir(), "flusk-watch-store-"));
	return {
		store: createFactStore({ dir }),
		cleanup: () => rm(dir, { recursive: true, force: true }),
	};
}

export function harness(client: FactStore, over: Partial<FluskConfig["watch"]> = {}): Harness {
	const cfg: FluskConfig = { ...DEFAULT_CONFIG, watch: { ...DEFAULT_CONFIG.watch, ...over } };
	const h: Harness = {
		log: [],
		ran: [],
		published: [],
		cleanups: 0,
		// A minute ahead of import time: facts are written a few ms after T0,
		// and an `as_of` read at exactly T0 would predate them.
		now: T0 + 60_000,
		result: "completed",
		explodes: false,
		items: [],
		deps: {} as WatchDeps,
	};
	h.deps = {
		repoRoot: "/tmp/repo",
		client,
		cfg,
		now: () => h.now,
		log: (l) => h.log.push(l),
		poll: () => ({ items: h.items, notes: [] }),
		runItem: async (i) => {
			h.ran.push(i);
			if (h.explodes) throw new Error("run exploded");
			return h.result;
		},
		openWorktree: () => ({ dir: "/tmp/wt", cleanup: () => h.cleanups++ }),
		publish: (i) => h.published.push(i),
	};
	return h;
}
