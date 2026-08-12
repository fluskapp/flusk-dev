import { afterEach, beforeEach, expect, it } from "vitest";
/**
 * Watch policy that is not the ledger's arithmetic: what gets published, how
 * far a failure backs off, and when the loop sleeps.
 */
import { watchLoop } from "../src/features/watch/loop.js";
import type { FactStore } from "../src/features/facts/types.js";
import { watchTick } from "../src/features/watch/tick.js";
import { HOUR, T0, harness, item, startMemory } from "./watch-harness.js";

let cleanup: () => Promise<void>;
let client: FactStore;

beforeEach(async () => {
	({ store: client, cleanup } = await startMemory());
});

afterEach(async () => {
	await cleanup();
});

it("publishes only when push is enabled", async () => {
	const off = harness(client, { push: false });
	off.items = [item("pr-off", "2026-08-01T09:00:00Z")];
	await watchTick(off.deps);
	expect(off.published).toHaveLength(0);

	const on = harness(client, { push: true });
	on.items = [item("pr-on", "2026-08-02T09:00:00Z")];
	await watchTick(on.deps);
	expect(on.published.map((i) => i.key)).toEqual(["pr-on"]);
});

it("a failed run backs off further than a successful one", async () => {
	const h = harness(client, { cooldownHours: 4, failCooldownHours: 8 });
	h.items = [item("pr-fail", "2026-08-01T09:00:00Z")];
	h.result = "blocked";
	await watchTick(h.deps);
	// Success would rest 4h; a first failure rests 8h.
	h.now = T0 + 5 * HOUR;
	expect((await watchTick(h.deps)).status).toBe("idle");
	h.now = T0 + 9 * HOUR;
	expect((await watchTick(h.deps)).status).toBe("ran");
});

it("the loop sleeps only when idle and stops at maxTicks", async () => {
	const h = harness(client);
	h.items = [item("pr-loop", "2026-08-01T09:00:00Z")];
	const sleeps: number[] = [];
	const summary = await watchLoop(h.deps, {
		maxTicks: 3,
		sleep: async (ms) => {
			sleeps.push(ms);
			h.now += ms;
		},
	});
	expect(summary.ticks).toBe(3);
	expect(summary.ran).toBe(1);
	expect(summary.completed).toBe(1);
	// Tick 1 worked the item and polled straight on; tick 2 found it resting
	// and waited. No sleep after the final tick.
	expect(sleeps).toEqual([600_000]);
});
