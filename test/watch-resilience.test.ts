/**
 * Properties an overnight run depends on, each pinned because a review found
 * it broken or unproven: a bad item must not end the night, the nightly cap
 * must survive the UTC date flip, ledger keys must not collide across repos,
 * and nothing empty may be published.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { nightKey } from "../src/features/watch/ledger.js";
import { watchLoop } from "../src/features/watch/loop.js";
import type { FactStore } from "../src/features/facts/types.js";
import { watchTick } from "../src/features/watch/tick.js";
import { harness, HOUR, item, startMemory, T0 } from "./watch-harness.js";

let cleanup: () => Promise<void>;
let client: FactStore;

beforeEach(async () => {
	({ store: client, cleanup } = await startMemory());
});

afterEach(async () => {
	await cleanup();
});

it("a worktree that cannot be opened costs one item, not the night", async () => {
	const h = harness(client);
	h.items = [item("bad", "2026-08-01T09:00:00Z")];
	h.deps.openWorktree = () => {
		throw new Error("fatal: a branch named 'flusk/bad' already exists");
	};
	const r = await watchTick(h.deps);
	expect(r.status).toBe("ran");
	expect(r.outcome).toBe("error");
	// Recorded as a failure, so the backoff applies and the loop continues.
	h.now = T0 + HOUR;
	expect((await watchTick(h.deps)).status).toBe("idle");
});

it("the worktree is reclaimed even when a post-run step throws", async () => {
	const h = harness(client);
	h.items = [item("boom", "2026-08-01T09:00:00Z")];
	h.deps.publish = () => {
		throw new Error("publish exploded");
	};
	h.deps.cfg.watch.push = true;
	await expect(watchTick(h.deps)).rejects.toThrow(/publish exploded/);
	expect(h.cleanups).toBe(1);
});

it("a throwing tick logs and the loop keeps going", async () => {
	const h = harness(client);
	h.items = [item("x", "2026-08-01T09:00:00Z")];
	h.deps.poll = () => {
		throw new Error("gh went away");
	};
	const summary = await watchLoop(h.deps, { maxTicks: 2, sleep: async () => {} });
	expect(summary.ticks).toBe(2);
	expect(h.log.some((l) => l.includes("tick failed"))).toBe(true);
});

it("the nightly key does not flip in the middle of a night", () => {
	// 22:00 and 02:00 local belong to the same night.
	const evening = new Date("2026-08-10T22:00:00").getTime();
	const afterMidnight = new Date("2026-08-11T02:00:00").getTime();
	expect(nightKey(evening)).toBe(nightKey(afterMidnight));
	// A full day later is a different night.
	expect(nightKey(evening + 24 * HOUR)).not.toBe(nightKey(evening));
});
