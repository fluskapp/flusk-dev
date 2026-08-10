/**
 * Shared fixtures for the watch-policy suites: a fake work queue, a fake
 * runner, and a mock-backed memory client, so every side effect the loop has
 * is observable without gh, git, or a model.
 */
import { createMemoryClient } from "../src/memory/client.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { HitConfig } from "../src/config/types.js";
import type { WorkItem } from "../src/watch/queue.js";
import type { RunItemResult, WatchDeps } from "../src/watch/tick.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

export const REPO_NS = "repo:watch-test";
export const T0 = Date.parse("2026-08-10T22:00:00.000Z");
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
	result: RunItemResult;
	items: WorkItem[];
}

export async function startMemory(): Promise<{ mock: MockAbagraph; client: MemoryClient }> {
	const mock = await startMockAbagraph();
	return { mock, client: createMemoryClient({ baseUrl: mock.url, apiKey: null }) };
}

export function harness(client: MemoryClient, over: Partial<HitConfig["watch"]> = {}): Harness {
	const cfg: HitConfig = { ...DEFAULT_CONFIG, watch: { ...DEFAULT_CONFIG.watch, ...over } };
	const h: Harness = {
		log: [],
		ran: [],
		published: [],
		cleanups: 0,
		now: T0,
		result: { outcome: "completed", runId: "r1", verdict: "ALLOW" },
		items: [],
		deps: {} as WatchDeps,
	};
	h.deps = {
		repoRoot: "/tmp/repo",
		repoNs: REPO_NS,
		repoSlug: "watch-test",
		client,
		cfg,
		now: () => h.now,
		log: (l) => h.log.push(l),
		poll: () => ({ items: h.items, notes: [] }),
		runItem: async (i) => {
			h.ran.push(i);
			if (h.result.outcome === "error" && h.result.runId === "throw") {
				throw new Error("run exploded");
			}
			return h.result;
		},
		openWorktree: () => ({ dir: "/tmp/wt", cleanup: () => h.cleanups++ }),
		publish: (i) => h.published.push(i),
	};
	return h;
}
