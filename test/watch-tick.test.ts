import { afterEach, beforeEach, expect, it } from "vitest";
import type { FactStore } from "../src/store/types.js";
import { watchTick } from "../src/watch/tick.js";
import { HOUR, T0, harness, item, startMemory } from "./watch-harness.js";

let cleanup: () => Promise<void>;
let client: FactStore;

beforeEach(async () => {
	({ store: client, cleanup } = await startMemory());
});

afterEach(async () => {
	await cleanup();
});

it("works the oldest item and cleans up its worktree", async () => {
	const h = harness(client);
	h.items = [item("new", "2026-08-10T21:00:00Z"), item("old", "2026-08-01T09:00:00Z")];
	const r = await watchTick(h.deps);
	expect(r.status).toBe("ran");
	expect(h.ran.map((i) => i.key)).toEqual(["old"]);
	expect(h.cleanups).toBe(1);
});

it("never works the same item twice in a night — the cooldown holds it", async () => {
	const h = harness(client);
	h.items = [item("pr-1", "2026-08-01T09:00:00Z")];
	await watchTick(h.deps);
	h.now = T0 + HOUR;
	const second = await watchTick(h.deps);
	expect(second.status).toBe("idle");
	expect(h.ran).toHaveLength(1);
});

it("records the attempt before running, so a crash still leaves a cooldown", async () => {
	const h = harness(client);
	h.items = [item("pr-boom", "2026-08-01T09:00:00Z")];
	h.explodes = true;
	const r = await watchTick(h.deps);
	// The thrown run is caught and recorded, not propagated.
	expect(r.outcome).toBe("error");
	h.now = T0 + HOUR;
	expect((await watchTick(h.deps)).status).toBe("idle");
});

it("holds at the nightly cap without polling for work", async () => {
	const h = harness(client, { maxRunsPerNight: 1 });
	h.items = [item("a", "2026-08-01T09:00:00Z"), item("b", "2026-08-02T09:00:00Z")];
	expect((await watchTick(h.deps)).status).toBe("ran");
	const capped = await watchTick(h.deps);
	expect(capped.status).toBe("night-cap");
	expect(h.ran).toHaveLength(1);
	expect(h.log.some((l) => l.includes("night cap"))).toBe(true);
});

