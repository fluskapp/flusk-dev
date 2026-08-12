import { describe, expect, it } from "vitest";
import type { ModelRef, Msg } from "../src/features/run/run.types.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/features/provider/fake.js";
import type { CompletionRequest, StreamEvent } from "../src/features/provider/provider.js";

const model: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 100_000 };

function makeReq(system: string, messages: Msg[]): CompletionRequest {
	return { model, system, messages, tools: [] };
}

async function collect(iter: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
	const events: StreamEvent[] = [];
	for await (const e of iter) events.push(e);
	return events;
}

describe("FakeProvider", () => {
	it("replays two scripted turns as exact event sequences", async () => {
		const turn1 = assistantToolCalls([{ id: "c1", name: "read", args: { path: "a.ts" } }], "hi");
		const turn2 = assistantText("done!");
		const provider = new FakeProvider([
			{
				deltas: [
					{ channel: "thinking", text: "hmm" },
					{ channel: "text", text: "hi" },
				],
				message: turn1,
			},
			{ deltas: [{ channel: "text", text: "done!" }], message: turn2 },
		]);
		const signal = new AbortController().signal;

		const first = await collect(provider.stream(makeReq("sys", []), signal));
		expect(first).toEqual([
			{ type: "thinking_delta", text: "hmm" },
			{ type: "text_delta", text: "hi" },
			{
				type: "toolcall",
				call: { type: "toolCall", id: "c1", name: "read", args: { path: "a.ts" } },
			},
			{ type: "done", message: turn1 },
		]);

		const second = await collect(provider.stream(makeReq("sys", []), signal));
		expect(second).toEqual([
			{ type: "text_delta", text: "done!" },
			{ type: "done", message: turn2 },
		]);
	});

	it("yields an error done-message when the script is exhausted, without throwing", async () => {
		const provider = new FakeProvider([]);
		const events = await collect(
			provider.stream(makeReq("sys", []), new AbortController().signal),
		);
		expect(events).toEqual([
			{
				type: "done",
				message: {
					role: "assistant",
					content: [],
					stopReason: "error",
					errorMessage: "FakeProvider: script exhausted",
					usage: { input: 0, output: 0, cacheRead: 0, costUsd: 0 },
				},
			},
		]);
	});

	it("yields stopReason aborted when the signal is already aborted", async () => {
		const provider = new FakeProvider([
			{ deltas: [{ channel: "text", text: "never" }], message: assistantText("never") },
		]);
		const controller = new AbortController();
		controller.abort();
		const events = await collect(provider.stream(makeReq("sys", []), controller.signal));
		expect(events).toHaveLength(1);
		const only = events[0];
		expect(only?.type).toBe("done");
		if (only?.type === "done") {
			expect(only.message.stopReason).toBe("aborted");
		}
	});

	it("records every request so tests can assert system and messages", async () => {
		const provider = new FakeProvider([
			{ message: assistantText("one") },
			{ message: assistantText("two") },
		]);
		const signal = new AbortController().signal;
		const req1 = makeReq("system prompt A", [{ role: "user", content: "task A" }]);
		const req2 = makeReq("system prompt B", [
			{ role: "user", content: "task A" },
			assistantText("one"),
		]);
		await collect(provider.stream(req1, signal));
		await collect(provider.stream(req2, signal));
		expect(provider.requests).toHaveLength(2);
		expect(provider.requests[0]?.system).toBe("system prompt A");
		expect(provider.requests[0]?.messages).toEqual([{ role: "user", content: "task A" }]);
		expect(provider.requests[1]?.system).toBe("system prompt B");
		expect(provider.requests[1]?.messages).toHaveLength(2);
	});
});
