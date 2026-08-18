/**
 * RunStream's live cost accumulator: turn:end frames add up, a ring replay
 * after reconnect must not double-count, and unrelated frames leave the
 * figure alone. EventSource is stubbed — no DOM harness.
 */
import { afterAll, expect, it, vi } from "vitest";
import { openRunStream, type RunStream } from "../src/ui/react/live/live-stream.js";

class FakeES {
	static instances: FakeES[] = [];
	static CLOSED = 2;
	static CONNECTING = 0;
	readyState = 0;
	onopen: (() => void) | null = null;
	onmessage: ((m: { data: string }) => void) | null = null;
	onerror: (() => void) | null = null;
	constructor(public url: string) {
		FakeES.instances.push(this);
	}
	addEventListener() {}
	close() {}
}
vi.stubGlobal("EventSource", FakeES);

afterAll(() => vi.unstubAllGlobals());

function open() {
	let stream: RunStream | undefined;
	const close = openRunStream("r1", (s) => {
		stream = s;
	});
	const es = FakeES.instances.at(-1) as FakeES;
	const frame = (e: unknown) => es.onmessage?.({ data: JSON.stringify(e) });
	return { last: () => stream as RunStream, frame, close };
}

const turnEnd = (turn: number, costUsd: number) => ({
	type: "turn:end",
	turn,
	message: { usage: { costUsd, input: 1, output: 1, cacheRead: 0 } },
});

it("accumulates cost across turn:end frames", () => {
	const s = open();
	s.frame(turnEnd(1, 0.01));
	s.frame(turnEnd(2, 0.02));
	expect(s.last().costUsd).toBeCloseTo(0.03);
	s.close();
});

it("does not double-count a ring replay after reconnect", () => {
	const s = open();
	s.frame(turnEnd(1, 0.01));
	s.frame(turnEnd(2, 0.02));
	s.frame(turnEnd(1, 0.01)); // the server replays its ring to a new connection
	s.frame(turnEnd(2, 0.02));
	expect(s.last().costUsd).toBeCloseTo(0.03);
	s.close();
});

it("keeps the accumulated cost through run:end", () => {
	const s = open();
	s.frame(turnEnd(1, 0.01));
	s.frame({ type: "run:end", reason: "completed" });
	expect(s.last().status).toBe("ended");
	expect(s.last().costUsd).toBeCloseTo(0.01);
	s.close();
});

it("ignores frames without usage semantics", () => {
	const s = open();
	s.frame({ type: "turn:start", turn: 1 });
	s.frame({ type: "tool:start", callId: "c1", name: "bash", args: {} });
	expect(s.last().costUsd).toBe(0);
	s.close();
});
