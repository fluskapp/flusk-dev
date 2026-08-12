/**
 * The nightly cap is the only thing standing between an unattended loop and a
 * night of unbounded spend, and it is counted from a store two `flusk` processes
 * share. Two watchers on different repositories work disjoint items under one
 * night key, so a night's budget has to survive being spent concurrently: a
 * read-modify-write counter loses one of the two writes, and the night quietly
 * runs twice as long as configured.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { nightCount, nightKey, recordNightRun } from "../src/watch/ledger.js";
import type { FactStore } from "../src/store/types.js";
import { watchTick } from "../src/watch/tick.js";
import { harness, item, startMemory, T0 } from "./watch-harness.js";

let cleanup: () => Promise<void>;
let client: FactStore;

beforeEach(async () => {
	({ store: client, cleanup } = await startMemory());
});

afterEach(async () => {
	await cleanup();
});

it("two watchers taking the night's first slot at once are both counted", async () => {
	const date = nightKey(T0);
	await Promise.all([
		recordNightRun(client, date, "repo-a/gh-prs-1", T0),
		recordNightRun(client, date, "repo-b/gh-prs-1", T0),
	]);
	expect(await nightCount(client, date)).toBe(2);
});

it("a tick never loses the night's budget to a concurrent one", async () => {
	const a = harness(client, { maxRunsPerNight: 2 });
	a.items = [item("repo-a/pr-1", "2026-08-01T09:00:00Z")];
	const b = harness(client, { maxRunsPerNight: 2 });
	b.items = [item("repo-b/pr-1", "2026-08-01T09:00:00Z")];

	await Promise.all([watchTick(a.deps), watchTick(b.deps)]);
	expect(a.ran).toHaveLength(1);
	expect(b.ran).toHaveLength(1);
	expect(await nightCount(client, nightKey(a.now))).toBe(2);

	// Both slots are spent, so the cap holds against the next tick.
	const c = harness(client, { maxRunsPerNight: 2 });
	c.items = [item("repo-c/pr-1", "2026-08-01T09:00:00Z")];
	expect((await watchTick(c.deps)).status).toBe("night-cap");
});
