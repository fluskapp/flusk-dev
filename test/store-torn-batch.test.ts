/**
 * What a process killed mid-append may cost. The log's contract is that a torn
 * tail costs that line only — which holds solely because a batch writes the
 * supersession BEFORE the value that replaces it. Written the other way round,
 * the tear that drops a close leaves two live values on a functional
 * predicate, and every compare-and-swap on that pair rejects from then on: the
 * task can never be claimed, completed or reset again.
 */
import { readFile, truncate } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
import { claimTask } from "../src/features/goals/scheduler.js";
import { type Harness, harness, NS, T0 } from "./store-harness.js";

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
});

/** Cuts the log a few bytes into its final record, as a kill mid-write would. */
async function tearLastRecord(path: string): Promise<void> {
	const text = await readFile(path, "utf8");
	const lastStart = text.lastIndexOf("\n", text.length - 2) + 1;
	await truncate(path, lastStart + 8);
}

it("a torn last record never leaves two live values on one predicate", async () => {
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "pending" }]);
	h.at(T0 + 1000);
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "running" }]);
	await tearLastRecord(h.logPath(NS));

	// Two visible actives is a state no expected value can ever satisfy: the
	// guard requires exactly one match, so the subject would be wedged for good.
	const live = await h.store.query(NS, { subject: "Task:1", predicate: "status" });
	expect(live.length).toBeLessThanOrEqual(1);

	// And the damage is repairable by the ordinary write path: assert the value
	// again and the pair answers a guard exactly as it did before the crash.
	h.at(T0 + 2000);
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "pending" }]);
	expect(await h.store.query(NS, { subject: "Task:1", predicate: "status" })).toHaveLength(1);
	expect(await claimTask(h.store, NS, "Task:1", "run-1")).not.toBeNull();
});
