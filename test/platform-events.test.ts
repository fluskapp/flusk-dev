/**
 * The wall between the loop and its watchers: the ring buffer never blocks a
 * push, drops oldest first, and tells a late reader exactly what it missed.
 * These are the properties that let a renderer die mid-run without the agent
 * noticing — the Electron invariant, tested at the seam that provides it.
 */
import { describe, expect, it } from "vitest";
import { createEventBus } from "../src/platform/events/events.js";
import { createRingBuffer } from "../src/platform/events/ring-buffer.js";
import { wireRunEvents } from "../src/features/run/run.events.js";

describe("ring buffer", () => {
	it("delivers in order and reports a caught-up reader as empty", () => {
		const rb = createRingBuffer<number>(4);
		rb.push(1);
		rb.push(2);
		const first = rb.readSince(0);
		expect(first).toEqual({ events: [1, 2], cursor: 2, dropped: 0 });
		expect(rb.readSince(first.cursor)).toEqual({ events: [], cursor: 2, dropped: 0 });
	});

	it("drops oldest first and confesses the count", () => {
		const rb = createRingBuffer<number>(3);
		for (const n of [1, 2, 3, 4, 5]) rb.push(n);
		expect(rb.readSince(0)).toEqual({ events: [3, 4, 5], cursor: 5, dropped: 2 });
	});

	it("head() lets a fresh consumer skip history", () => {
		const rb = createRingBuffer<string>(8);
		rb.push("old");
		const cursor = rb.head();
		rb.push("new");
		expect(rb.readSince(cursor)).toEqual({ events: ["new"], cursor: 2, dropped: 0 });
	});

	it("refuses a nonsensical capacity", () => {
		expect(() => createRingBuffer(0)).toThrow(/positive integer/);
	});
});

describe("wireRunEvents", () => {
	it("a stalled consumer costs the loop nothing: emit resolves without any read", async () => {
		const bus = createEventBus();
		const feed = wireRunEvents(bus, "r1", 2);
		// Nobody ever reads; every emit must still resolve immediately.
		for (let turn = 1; turn <= 50; turn++) await bus.emit({ type: "turn:start", turn });
		const read = feed.readSince(0);
		expect(read.dropped).toBe(48);
		expect(read.events.map((e) => e.event)).toEqual([
			{ type: "turn:start", turn: 49 },
			{ type: "turn:start", turn: 50 },
		]);
		expect(read.events.every((e) => e.runId === "r1")).toBe(true);
	});

	it("close() detaches from the bus", async () => {
		const bus = createEventBus();
		const feed = wireRunEvents(bus, "r1");
		await bus.emit({ type: "turn:start", turn: 1 });
		feed.close();
		await bus.emit({ type: "turn:start", turn: 2 });
		expect(feed.readSince(0).events).toHaveLength(1);
	});
});
