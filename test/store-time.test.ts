import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
import { type Harness, HOUR, harness, iso, NOW, NS, T0 } from "./store-harness.js";

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
});

it("an expired fact is invisible to a read but still on disk", async () => {
	await h.store.transact(NS, [
		{
			subject: "Item:gh-prs",
			predicate: "cooldown_until",
			object: iso(T0 + HOUR),
			validUntil: iso(T0 + HOUR),
			transient: true,
		},
	]);
	expect(await h.store.query(NS, { asOf: T0 + HOUR / 2 })).toHaveLength(1);
	expect(await h.store.query(NS, { asOf: T0 + HOUR })).toHaveLength(0);
	expect(await h.store.query(NS, { asOf: T0 + 2 * HOUR })).toHaveLength(0);
	// Invisible is not gone: an earlier snapshot still finds it, and so does
	// the raw log — expiry must never be implemented as a delete.
	expect(await h.store.query(NS, { asOf: T0 + HOUR / 2 })).toHaveLength(1);
	expect(await readFile(h.logPath(NS), "utf8")).toContain("cooldown_until");
});

it("the cooldown pattern: TTL expiry IS retry eligibility, with no asOf passed", async () => {
	const resting = "Item:resting";
	const done = "Item:done";
	await h.store.transact(NS, [
		{
			subject: resting,
			predicate: "cooldown_until",
			object: iso(NOW + HOUR),
			validUntil: iso(NOW + HOUR),
			transient: true,
		},
	]);
	await h.store.transact(NS, [
		{
			subject: done,
			predicate: "cooldown_until",
			object: iso(T0 - HOUR),
			validUntil: iso(T0 - HOUR),
			transient: true,
		},
	]);
	// A bare read is the live-now snapshot, not "rows with no validUntil".
	const cooling = await h.store.query(NS, { predicate: "cooldown_until" });
	expect(cooling.map((f) => f.subject)).toEqual([resting]);
	expect(await h.store.query(NS, { subject: done, predicate: "cooldown_until" })).toHaveLength(0);
});

it("asOf travels in time and accepts ISO-8601 or epoch milliseconds", async () => {
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "pending" }]);
	h.at(T0 + HOUR);
	await h.store.transact(NS, [{ subject: "Task:1", predicate: "status", object: "done" }]);

	// Before anything was asserted.
	expect(await h.store.query(NS, { asOf: T0 - 1, status: "active,superseded" })).toHaveLength(0);
	const mid = await h.store.query(NS, { asOf: T0 + 60_000, status: "active,superseded" });
	expect(mid.map((f) => f.object)).toEqual(["pending"]);
	const later = await h.store.query(NS, {
		asOf: iso(T0 + 2 * HOUR),
		status: "active,superseded",
	});
	expect(later.map((f) => f.object)).toEqual(["done"]);
	// Status is applied independently of asOf: the row live at the cutoff is
	// superseded NOW, so a default read of that same instant returns nothing.
	expect(await h.store.query(NS, { asOf: T0 + 60_000 })).toHaveLength(0);
});

it("two snapshots diff into added and superseded, which is what the change feed needs", async () => {
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "test_cmd", object: "vitest" }]);
	const cutoff = T0 + HOUR;
	h.at(cutoff + 1000);
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "test_cmd", object: "npm test" }]);
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "lint_cmd", object: "biome" }]);

	const status = "active,candidate,superseded";
	const before = await h.store.query(NS, { status, asOf: cutoff, limit: 500 });
	const now = await h.store.query(NS, { status, asOf: cutoff + 2000, limit: 500 });
	const idsBefore = new Set(before.map((f) => f.id));
	const idsNow = new Set(now.map((f) => f.id));
	expect(now.filter((f) => !idsBefore.has(f.id)).map((f) => f.object)).toEqual([
		"npm test",
		"biome",
	]);
	expect(before.filter((f) => !idsNow.has(f.id)).map((f) => f.object)).toEqual(["vitest"]);
});

it("results are oldest first, and the cap keeps the newest rows", async () => {
	for (let i = 0; i < 5; i++) {
		h.at(T0 + i * 1000);
		await h.store.transact(NS, [
			{ subject: "Run:1", predicate: "note", object: `n${i}`, coexist: true },
		]);
	}
	// The rows a cap drops are the ones no caller asks about. A cap off the
	// other end answers "what just happened" with the oldest page in the
	// namespace, and says nothing about having done so.
	const capped = await h.store.query(NS, { predicate: "note", limit: 3 });
	expect(capped.map((f) => f.object)).toEqual(["n2", "n3", "n4"]);
	expect(await h.store.query(NS, { predicate: "note" })).toHaveLength(5);
});

it("timestamps are ISO-8601 UTC, so lexical order is chronological order", async () => {
	await h.store.transact(NS, [{ subject: "Run:1", predicate: "outcome", object: "ok" }]);
	h.at(T0 + HOUR);
	await h.store.transact(NS, [{ subject: "Run:2", predicate: "outcome", object: "ok" }]);
	const rows = await h.store.query(NS, { predicate: "outcome" });
	const [first, second] = rows;
	expect(first?.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
	expect((first?.validFrom ?? "").localeCompare(second?.validFrom ?? "")).toBeLessThan(0);
});
