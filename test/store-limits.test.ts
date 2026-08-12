/**
 * What a row cap is allowed to cost. A namespace grows forever, so every read
 * eventually meets its cap; the property pinned here is that meeting it costs
 * history, never the present — and that a read whose answer needs the whole
 * namespace can ask for it.
 */
import { afterEach, beforeEach, expect, it } from "vitest";
import { whatsChanged } from "../src/features/facts/changes.js";
import { DEFAULT_LIMIT, NO_LIMIT } from "../src/features/facts/visibility.js";
import { type Harness, HOUR, harness, iso, NS, T0 } from "./store-harness.js";

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
});

/** `count` durable rows, one per second from T0, each on its own subject. */
async function fill(count: number): Promise<void> {
	for (let i = 0; i < count; i++) {
		h.at(T0 + i * 1000);
		await h.store.transact(NS, [{ subject: `Task:t${i}`, predicate: "status", object: "done" }]);
	}
}

it("the newest row survives a capped read of a namespace past its cap", async () => {
	await fill(DEFAULT_LIMIT + 20);
	h.at(T0 + 10 * HOUR);
	await h.store.transact(NS, [{ subject: "Task:fresh", predicate: "status", object: "pending" }]);

	const capped = await h.store.query(NS, { predicate: "status" });
	expect(capped).toHaveLength(DEFAULT_LIMIT);
	expect(capped.map((f) => f.subject)).toContain("Task:fresh");
	expect(await h.store.query(NS, { predicate: "status", limit: NO_LIMIT })).toHaveLength(
		DEFAULT_LIMIT + 21,
	);
});

it("the change feed reports an addition in a namespace past the snapshot cap", async () => {
	// The failure this pins: both snapshots collapse onto the same page, the
	// diff comes back empty, and a resume brief says "0 added, 0 superseded"
	// for a period in which a whole goal was planned.
	await fill(520);
	const cutoff = T0 + 520 * 1000;
	h.at(cutoff + 1000);
	await h.store.transact(NS, [{ subject: "Goal:new", predicate: "title", object: "ship it" }]);

	const changes = await whatsChanged(h.store, NS, iso(cutoff), cutoff + 2000);
	expect(changes.added.map((f) => f.subject)).toEqual(["Goal:new"]);
	expect(changes.superseded).toHaveLength(0);
});

it("the change feed reports a supersession outside the oldest page", async () => {
	await fill(520);
	const cutoff = T0 + 520 * 1000;
	h.at(cutoff + 1000);
	await h.store.transact(NS, [{ subject: "Task:t519", predicate: "status", object: "failed" }]);

	const changes = await whatsChanged(h.store, NS, iso(cutoff), cutoff + 2000);
	expect(changes.superseded.map((f) => f.object)).toEqual(["done"]);
	expect(changes.added.map((f) => f.object)).toEqual(["failed"]);
});
