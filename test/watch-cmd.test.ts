/**
 * What `ah watch` does before it polls anything: honour a request to leave no
 * trace by refusing (an unattended loop with no ledger is not a quieter loop,
 * it is an unbounded one), and reclaim the cooldown rows of nights gone by,
 * which are the only records in the ledger that answer no question once their
 * TTL has passed.
 */
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
import { goalCmd } from "../src/cli/goal-cmd.js";
import { watchCmd } from "../src/cli/watch-cmd.js";
import { AH_NS } from "../src/store/namespaces.js";
import { nsPath, storeDir } from "../src/store/paths.js";
import { createFactStore } from "../src/store/store.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome, writeHomeConfig } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-watch-cmd-");
}, SLOW);

afterEach(() => {
	teardownTestHome();
}, SLOW);

it("refuses to start when the run is asked to leave no trace", async () => {
	await writeHomeConfig({ memory: { enabled: false } });
	const cap = capture();
	expect(await watchCmd({ repo, maxTicks: 0, out: cap.out })).toBe(1);
	expect(cap.text()).toContain("needs the fact store");
	// Refused before anything was written: no ledger, no queue poll.
	expect(cap.text()).not.toContain("queues");
});

it("ah goal refuses too, because its task graph IS the store", async () => {
	await writeHomeConfig({ memory: { enabled: false } });
	const cap = capture();
	expect(await goalCmd({ goal: "ship it", repo, out: cap.out })).toBe("blocked");
	expect(cap.text()).toContain("needs the fact store");
});

it("reclaims expired cooldowns from the ledger on the way in", async () => {
	const store = createFactStore();
	const past = new Date(Date.now() - 60_000).toISOString();
	await store.transact(AH_NS, [
		{
			subject: "Item:gh-prs-1",
			predicate: "cooldown_until",
			object: past,
			validUntil: past,
			transient: true,
		},
	]);
	await store.transact(AH_NS, [
		{ subject: "Item:gh-prs-1", predicate: "outcome", object: "completed" },
	]);

	const cap = capture();
	expect(await watchCmd({ repo, maxTicks: 0, out: cap.out })).toBe(0);

	const log = await readFile(nsPath(storeDir(), AH_NS), "utf8");
	expect(log).not.toContain("cooldown_until");
	// Durable history is never swept: only the expired TTL row goes.
	expect(log).toContain("outcome");
});
