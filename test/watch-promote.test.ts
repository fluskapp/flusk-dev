import { afterEach, beforeEach, expect, it } from "vitest";
import { LESSONS_NS } from "../src/memory/namespaces.js";
import { watchLoop } from "../src/watch/loop.js";
import { watchTick } from "../src/watch/tick.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { HOUR, REPO_NS, T0, harness, item, startMemory } from "./watch-harness.js";
import type { MockAbagraph } from "./mock-abagraph.js";

let mock: MockAbagraph;
let client: MemoryClient;

beforeEach(async () => {
	({ mock, client } = await startMemory());
});

afterEach(async () => {
	await mock.close();
});

it("promotes lessons only on an ALLOW verdict", async () => {
	const seed = async (runId: string): Promise<void> => {
		await client.transact(REPO_NS, [
			{
				subject: "ErrorClass:flaky-timeout",
				predicate: "fixed_by",
				object: "await the deferred instead of sleeping",
				confidence: 0.7,
				source: `digest:run:${runId}`,
			},
		]);
	};

	const warn = harness(client);
	warn.items = [item("pr-warn", "2026-08-01T09:00:00Z")];
	warn.result = { outcome: "completed", runId: "rw", verdict: "WARN" };
	await seed("rw");
	await watchTick(warn.deps);
	expect(await client.query(LESSONS_NS, { predicate: "fixed_by" })).toHaveLength(0);

	const allow = harness(client);
	allow.items = [item("pr-allow", "2026-08-02T09:00:00Z")];
	allow.result = { outcome: "completed", runId: "ra", verdict: "ALLOW" };
	await seed("ra");
	await watchTick(allow.deps);
	const lessons = await client.query(LESSONS_NS, { predicate: "fixed_by" });
	expect(lessons.map((f) => f.object)).toEqual(["await the deferred instead of sleeping"]);
	expect(lessons[0]?.confidence).toBe(0.9);
	// The cross-repo provenance edge rides along.
	expect(await client.query(LESSONS_NS, { predicate: "seen_in" })).toHaveLength(1);
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
	h.result = { outcome: "blocked", runId: "rf" };
	await watchTick(h.deps);
	// Success would rest 4h; a first failure rests 8h.
	h.now = T0 + 5 * HOUR;
	expect((await watchTick(h.deps)).status).toBe("idle");
	h.now = T0 + 9 * HOUR;
	expect((await watchTick(h.deps)).status).toBe("ran");
});

it("the loop sleeps only when idle and stops at maxTicks", async () => {
	const h = harness(client, );
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
