/**
 * The run feature's event subscribers: every bus event is copied into a
 * bounded drop-oldest ring buffer, stamped with its run.
 *
 * This is the only sanctioned way for a live UI to watch a run. Subscribing a
 * response stream to the bus directly would put a network peer inside the
 * agent loop's await chain (platform/events awaits listeners serially); the
 * buffer's push is synchronous, so the loop pays one array write per event no
 * matter how many watchers exist or how stalled they are. The SSE route reads
 * from here at its own pace and is told what it missed.
 */
import { createRingBuffer, type RingBuffer, type RingRead } from "../../platform/events/ring-buffer.js";
import type { EventBus, FluskEvent } from "../../platform/events/events.js";

/** A bus event, stamped with the run it belongs to. */
export interface RunEvent {
	runId: string;
	event: FluskEvent;
}

/** Enough for the heaviest observed runs; a stalled reader loses oldest first. */
export const RUN_BUFFER_CAPACITY = 4096;

export interface RunEventFeed {
	/** Read events after `cursor`, oldest first, with the count that aged out. */
	readSince(cursor: number): RingRead<RunEvent>;
	/** Where a fresh consumer starts to see only new events. */
	head(): number;
	/** Detach from the bus. */
	close(): void;
}

/**
 * Wires a bus into a fresh buffer. `runId` is fixed at wiring time — one agent
 * run owns one bus — and stamped on every event so a multiplexed consumer can
 * filter without parsing payloads.
 */
export function wireRunEvents(
	bus: EventBus,
	runId: string,
	capacity: number = RUN_BUFFER_CAPACITY,
): RunEventFeed {
	const buffer: RingBuffer<RunEvent> = createRingBuffer(capacity);
	const types: FluskEvent["type"][] = [
		"run:start",
		"turn:start",
		"assistant:delta",
		"tool:start",
		"tool:update",
		"tool:end",
		"turn:end",
		"compaction",
		"context:built",
		"run:end",
	];
	// The listener is synchronous and returns nothing awaitable: the loop's
	// serial emit pays one buffer write here, never a consumer's pace.
	const offs = types.map((t) => bus.on(t, (event) => buffer.push({ runId, event })));
	return {
		readSince: (cursor) => buffer.readSince(cursor),
		head: () => buffer.head(),
		close: () => {
			for (const off of offs) off();
		},
	};
}
