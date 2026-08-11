import { afterEach, beforeEach, expect, it } from "vitest";
import type { CompareFailedError, FactStore } from "../src/store/types.js";
import { type Harness, HOUR, harness, iso, NS, T0 } from "./store-harness.js";

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
});

/** The claim in src/goals/scheduler.ts: null means another session won. */
async function claim(store: FactStore, taskId: string, runId: string): Promise<number | null> {
	try {
		const out = await store.transact(
			NS,
			[
				{ subject: taskId, predicate: "status", object: "running" },
				{ subject: taskId, predicate: "attempted_by", object: runId },
			],
			[{ subject: taskId, predicate: "status", object: "pending" }],
		);
		return out.tx;
	} catch (e) {
		if ((e as CompareFailedError).code === "CompareFailed") return null;
		throw e;
	}
}

it("a guard that holds lets the swap through", async () => {
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "pending" }]);
	h.at(T0 + 1000);
	expect(await claim(h.store, "Task:1", "run:a")).not.toBeNull();
	const rows = await h.store.query(NS, { subject: "Task:1" });
	expect(rows.map((f) => f.object).sort()).toEqual(["run:a", "running"]);
});

it("a failing guard rejects the whole batch with CompareFailed and writes nothing", async () => {
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "running" }]);
	h.at(T0 + 1000);
	const failed = await h.store
		.transact(
			NS,
			[
				{ subject: "Task:1", predicate: "status", object: "done" },
				{ subject: "Task:1", predicate: "closed_by", object: "run:b" },
			],
			[{ subject: "Task:1", predicate: "status", object: "pending" }],
		)
		.catch((e: CompareFailedError) => e);

	const err = failed as CompareFailedError;
	expect(err.code).toBe("CompareFailed");
	expect(err.failures).toEqual([{ subject: "Task:1", predicate: "status", object: "pending" }]);
	// Neither assert landed: a half-applied batch is what corrupts a claim.
	const rows = await h.store.query(NS, { status: "active,candidate,superseded" });
	expect(rows.map((f) => f.object)).toEqual(["running"]);
});

it("no visible value and two visible values both fail the guard", async () => {
	await expect(
		h.store.transact(
			NS,
			[{ subject: "Task:9", predicate: "status", object: "running" }],
			[{ subject: "Task:9", predicate: "status", object: "pending" }],
		),
	).rejects.toMatchObject({ code: "CompareFailed" });

	for (const owner of ["run:a", "run:b"]) {
		await h.store.transact(NS, [
			{ subject: "Task:2", predicate: "owner", object: owner, coexist: true },
		]);
	}
	// Two live answers: no single expected value can settle which one to swap.
	await expect(
		h.store.transact(
			NS,
			[{ subject: "Task:2", predicate: "status", object: "running" }],
			[{ subject: "Task:2", predicate: "owner", object: "run:a" }],
		),
	).rejects.toMatchObject({ code: "CompareFailed" });
});

it("an expired or superseded value cannot satisfy a guard", async () => {
	await h.store.transact(NS, [
		{
			subject: "Lease:1",
			predicate: "held_by",
			object: "run:a",
			validUntil: iso(T0 + HOUR),
		},
	]);
	h.at(T0 + 2 * HOUR);
	await expect(
		h.store.transact(
			NS,
			[{ subject: "Lease:1", predicate: "held_by", object: "run:b" }],
			[{ subject: "Lease:1", predicate: "held_by", object: "run:a" }],
		),
	).rejects.toMatchObject({ code: "CompareFailed" });

	await h.store.transact(NS, [{ subject: "Task:3", predicate: "status", object: "pending" }]);
	h.at(T0 + 3 * HOUR);
	await h.store.transact(NS, [{ subject: "Task:3", predicate: "status", object: "done" }]);
	await expect(
		h.store.transact(
			NS,
			[{ subject: "Task:3", predicate: "status", object: "running" }],
			[{ subject: "Task:3", predicate: "status", object: "pending" }],
		),
	).rejects.toMatchObject({ code: "CompareFailed" });
});

it("exactly one of several concurrent sessions claims the task", async () => {
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "pending" }]);
	h.at(T0 + 1000);
	// Separate store instances: the competing claimer is another `ah` process,
	// so the in-process queue alone would not stop a double claim.
	const claimers = [h.store, h.rival(), h.rival()];
	const results = await Promise.all(claimers.map((s, i) => claim(s, "Task:1", `run:${i}`)));
	expect(results.filter((r) => r !== null)).toHaveLength(1);

	const owners = await h.store.query(NS, { subject: "Task:1", predicate: "attempted_by" });
	expect(owners).toHaveLength(1);
	expect((await h.store.query(NS, { subject: "Task:1", predicate: "status" }))[0]?.object).toBe(
		"running",
	);
});

it("a guard never sees another namespace's value", async () => {
	await h.store.transact("other", [{ subject: "Task:1", predicate: "status", object: "pending" }]);
	await expect(
		h.store.transact(
			NS,
			[{ subject: "Task:1", predicate: "status", object: "running" }],
			[{ subject: "Task:1", predicate: "status", object: "pending" }],
		),
	).rejects.toMatchObject({ code: "CompareFailed" });
});
