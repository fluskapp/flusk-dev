import { afterEach, beforeEach, expect, it } from "vitest";
import { createFactStore } from "../src/store/store.js";
import { type Harness, harness, iso, NS, T0 } from "./store-harness.js";

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
});

it("a functional predicate keeps one answer: the new value closes the old", async () => {
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "pending" }]);
	h.at(T0 + 1000);
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "running" }]);

	expect((await h.store.query(NS, { subject: "Task:1" })).map((f) => f.object)).toEqual([
		"running",
	]);

	// Closed, not deleted: the old value is still readable at an instant when
	// it was true, stamped with the moment it stopped being true.
	const before = await h.store.query(NS, {
		subject: "Task:1",
		status: "active,superseded",
		asOf: T0 + 500,
	});
	expect(before.map((f) => f.object)).toEqual(["pending"]);
	expect(before[0]?.status).toBe("superseded");
	expect(before[0]?.validUntil).toBe(iso(T0 + 1000));
	// And it is gone from the live snapshot even when superseded rows are asked
	// for, because the time filter and the status filter are separate tests.
	const now = await h.store.query(NS, { subject: "Task:1", status: "active,superseded" });
	expect(now.map((f) => f.object)).toEqual(["running"]);
	expect(now[0]?.validUntil).toBeNull();
});

it("coexist adds beside the existing values instead of replacing them", async () => {
	for (const [i, tag] of ["cli", "memory", "watch"].entries()) {
		h.at(T0 + i * 1000);
		await h.store.transact(NS, [
			{ subject: "ErrorClass:ENOENT", predicate: "seen_in", object: tag, coexist: true },
		]);
	}
	const facts = await h.store.query(NS, { predicate: "seen_in" });
	expect(facts.map((f) => f.object)).toEqual(["cli", "memory", "watch"]);
	expect(facts.every((f) => f.status === "active")).toBe(true);
});

it("an identical live fact dedups: same id back, no second row, nothing closed", async () => {
	const input = {
		subject: "ErrorClass:TS2345",
		predicate: "fixed_by",
		object: "widen the param",
		confidence: 0.9,
		source: "gate:run:7",
	};
	const first = await h.store.transact(NS, [input]);
	h.at(T0 + 5000);
	const again = await h.store.transact(NS, [input]);

	expect(again.ids).toEqual(first.ids);
	expect(again.tx).toBeGreaterThan(first.tx);
	const all = await h.store.query(NS, { status: "active,candidate,superseded" });
	expect(all).toHaveLength(1);
	expect(all[0]?.validFrom).toBe(iso(T0));
});

it("a different source, or a confidence outside the tolerance, is a new value", async () => {
	const base = { subject: "Repo:flusk", predicate: "test_cmd", object: "npm test", confidence: 0.9 };
	await h.store.transact(NS, [{ ...base, source: "run:1" }]);
	h.at(T0 + 1000);
	const nudged = await h.store.transact(NS, [{ ...base, source: "run:1", confidence: 0.9004 }]);
	// Within 1e-3 the confidence is the same number, so this is still a dedup.
	expect((await h.store.query(NS, {})).map((f) => f.id)).toEqual(nudged.ids);

	h.at(T0 + 2000);
	await h.store.transact(NS, [{ ...base, source: "run:2" }]);
	const live = await h.store.query(NS, {});
	expect(live).toHaveLength(1);
	expect(live[0]?.source).toBe("run:2");
	expect(await h.store.query(NS, { status: "superseded", asOf: T0 + 1500 })).toHaveLength(1);
});

it("a Candidate is parked out of default reads and supersedes nothing", async () => {
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "lint_cmd", object: "biome" }]);
	h.at(T0 + 1000);
	await h.store.transact(NS, [
		{ subject: "Repo:flusk", predicate: "lint_cmd", object: "eslint", confidence: 0.6 },
	]);

	expect((await h.store.query(NS, {})).map((f) => f.object)).toEqual(["biome"]);
	const parked = await h.store.query(NS, { status: "candidate" });
	expect(parked.map((f) => f.object)).toEqual(["eslint"]);
	expect(parked[0]?.status).toBe("candidate");
	// 0.75 is the boundary itself: at the threshold the fact is active.
	h.at(T0 + 2000);
	await h.store.transact(NS, [
		{ subject: "Repo:flusk", predicate: "fmt_cmd", object: "biome", confidence: 0.75 },
	]);
	expect(await h.store.query(NS, { predicate: "fmt_cmd" })).toHaveLength(1);
});

it("rejects an empty batch and a repeated (subject, predicate), writing nothing", async () => {
	await expect(h.store.transact(NS, [])).rejects.toThrow(/must not be empty/);
	await expect(
		h.store.transact(NS, [
			{ subject: "Task:1", predicate: "status", object: "done" },
			{ subject: "Task:1", predicate: "status", object: "failed" },
		]),
	).rejects.toThrow(/asserted twice in one call/);
	expect(await h.store.query(NS, { status: "active,candidate,superseded" })).toHaveLength(0);
});

it("tx ascends across sessions and ids come back in assert order", async () => {
	const first = await h.store.transact(NS, [
		{ subject: "Task:1", predicate: "status", object: "running" },
		{ subject: "Task:1", predicate: "attempted_by", object: "run:9" },
	]);
	expect(first.ids).toHaveLength(2);
	const rows = await h.store.query(NS, {});
	expect(first.ids[0]).toBe(rows.find((f) => f.predicate === "status")?.id);
	expect(first.ids[1]).toBe(rows.find((f) => f.predicate === "attempted_by")?.id);

	h.at(T0 + 1000);
	// A fresh store reads the highest tx back off the log rather than restarting.
	const reopened = createFactStore({ dir: h.dir, now: () => T0 + 1000 });
	const second = await reopened.transact(NS, [
		{ subject: "Task:2", predicate: "status", object: "pending" },
	]);
	expect(second.tx).toBeGreaterThan(first.tx);
});
