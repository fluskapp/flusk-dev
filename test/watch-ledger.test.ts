import { afterAll, beforeAll, expect, it } from "vitest";
import { createMemoryClient } from "../src/memory/client.js";
import type { MemoryClient } from "../src/memory/client-types.js";
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
} from "../src/watch/ledger.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

const HOUR = 3_600_000;
const T0 = Date.parse("2026-08-10T22:00:00.000Z");

let mock: MockAbagraph;
let client: MemoryClient;

beforeAll(async () => {
	mock = await startMockAbagraph();
	client = createMemoryClient({ baseUrl: mock.url, apiKey: null });
});

afterAll(async () => {
	await mock.close();
});

it("backs off quadratically after repeated failures", () => {
	const base = cooldownUntil(T0, 4, 8, 0);
	expect(Date.parse(base) - T0).toBe(4 * HOUR);
	expect(Date.parse(cooldownUntil(T0, 4, 8, 1)) - T0).toBe(8 * HOUR);
	expect(Date.parse(cooldownUntil(T0, 4, 8, 2)) - T0).toBe(32 * HOUR);
	expect(Date.parse(cooldownUntil(T0, 4, 8, 3)) - T0).toBe(72 * HOUR);
});

it("an attempt cools the item down, and expiry is by timestamp not presence", async () => {
	const key = "gh-prs-1";
	expect(await isCoolingDown(client, key, T0)).toBe(false);
	await recordAttempt(client, key, T0, cooldownUntil(T0, 4, 8, 0));

	expect(await isCoolingDown(client, key, T0 + HOUR)).toBe(true);
	// The TTL sweeper is not instant: a still-stored but past cooldown must
	// read as expired, or the item would rest forever.
	expect(await isCoolingDown(client, key, T0 + 5 * HOUR)).toBe(false);
});

it("counts only unsuccessful outcomes across supersessions", async () => {
	const key = "gh-prs-2";
	expect(await failureCount(client, key)).toBe(0);
	await recordOutcome(client, key, "error");
	expect(await failureCount(client, key)).toBe(1);
	// `outcome` is functional, so this supersedes — history still counts.
	await recordOutcome(client, key, "blocked");
	expect(await failureCount(client, key)).toBe(2);
	await recordOutcome(client, key, "completed");
	expect(await failureCount(client, key)).toBe(2);
});

it("re-stamping a cooldown extends the rest period", async () => {
	const key = "gh-prs-3";
	await recordAttempt(client, key, T0, cooldownUntil(T0, 4, 8, 0));
	expect(await isCoolingDown(client, key, T0 + 5 * HOUR)).toBe(false);
	await extendCooldown(client, key, cooldownUntil(T0, 4, 8, 1));
	expect(await isCoolingDown(client, key, T0 + 5 * HOUR)).toBe(true);
});

it("tracks the nightly run count per date", async () => {
	const date = nightKey(T0);
	expect(date).toBe("2026-08-10");
	expect(await nightCount(client, date)).toBe(0);
	await bumpNightCount(client, date, 0);
	expect(await nightCount(client, date)).toBe(1);
	await bumpNightCount(client, date, 1);
	expect(await nightCount(client, date)).toBe(2);
	// A different night starts fresh.
	expect(await nightCount(client, nightKey(T0 + 24 * HOUR))).toBe(0);
});
