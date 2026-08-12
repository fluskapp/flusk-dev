/**
 * The bounded buffer between the agent loop and anything that watches it.
 *
 * The bus awaits listeners serially, so a subscriber that blocks stalls the
 * loop — and an HTTP response subscribed directly to the bus would let a
 * stalled renderer stop the agent. This buffer is the wall between those two
 * worlds: the loop-side `push` is synchronous and never waits for anyone, and
 * a consumer reads at its own pace by cursor. When a reader falls more than
 * `capacity` events behind, the oldest events are dropped and the reader is
 * told how many it missed — a live view can say "…skipped 214 events" and
 * catch up, which is strictly better than either unbounded memory or a
 * paused run.
 */

export interface RingRead<T> {
	/** Events since the cursor, oldest first; empty when caught up. */
	events: T[];
	/** The cursor to pass next time. */
	cursor: number;
	/** Events that aged out before this reader arrived; 0 when none. */
	dropped: number;
}

export interface RingBuffer<T> {
	/** Loop side. Synchronous, allocation-light, never blocks, never throws. */
	push(event: T): void;
	/** Consumer side. `cursor` 0 (or older than the window) starts at the oldest retained event. */
	readSince(cursor: number): RingRead<T>;
	/** Sequence number of the next event; a fresh consumer starts here to skip history. */
	head(): number;
}

export function createRingBuffer<T>(capacity: number): RingBuffer<T> {
	if (!Number.isInteger(capacity) || capacity <= 0) {
		throw new Error(`ring buffer capacity must be a positive integer, got ${capacity}`);
	}
	const slots: T[] = new Array(capacity);
	/** Total events ever pushed; the window is [next - retained, next). */
	let next = 0;
	return {
		push(event) {
			slots[next % capacity] = event;
			next++;
		},
		readSince(cursor) {
			const oldest = Math.max(0, next - capacity);
			const from = Math.max(cursor, oldest);
			const events: T[] = [];
			for (let i = from; i < next; i++) events.push(slots[i % capacity] as T);
			return { events, cursor: next, dropped: Math.max(0, from - cursor) };
		},
		head: () => next,
	};
}
