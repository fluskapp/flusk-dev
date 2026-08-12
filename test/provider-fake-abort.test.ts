import { describe, expect, it } from "vitest";
import type { ModelRef } from "../src/features/run/run.types.js";
import { zeroUsage } from "../src/features/run/run.types.js";
import { assistantText, assistantToolCalls, FakeProvider } from "../src/features/provider/fake.js";
import type { CompletionRequest, StreamEvent } from "../src/features/provider/provider.js";

const model: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 100_000 };

function makeReq(): CompletionRequest {
	return { model, system: "sys", messages: [], tools: [] };
}

const abortedDone: StreamEvent = {
	type: "done",
	message: { role: "assistant", content: [], stopReason: "aborted", usage: zeroUsage() },
};

describe("FakeProvider mid-stream abort", () => {
	it("abort between deltas yields an aborted done and ends the stream", async () => {
		const provider = new FakeProvider([
			{
				deltas: [
					{ channel: "text", text: "a" },
					{ channel: "text", text: "b" },
				],
				message: assistantText("ab"),
			},
		]);
		const controller = new AbortController();
		const events: StreamEvent[] = [];
		for await (const e of provider.stream(makeReq(), controller.signal)) {
			events.push(e);
			if (events.length === 1) controller.abort();
		}
		expect(events).toEqual([{ type: "text_delta", text: "a" }, abortedDone]);
	});

	it("abort between toolcall events yields an aborted done and ends the stream", async () => {
		const provider = new FakeProvider([
			{
				message: assistantToolCalls([
					{ id: "c1", name: "read", args: { file_path: "a.ts" } },
					{ id: "c2", name: "read", args: { file_path: "b.ts" } },
				]),
			},
		]);
		const controller = new AbortController();
		const events: StreamEvent[] = [];
		for await (const e of provider.stream(makeReq(), controller.signal)) {
			events.push(e);
			if (e.type === "toolcall") controller.abort();
		}
		expect(events).toEqual([
			{
				type: "toolcall",
				call: { type: "toolCall", id: "c1", name: "read", args: { file_path: "a.ts" } },
			},
			abortedDone,
		]);
	});

	it("abort after the deltas but before done replaces the final message", async () => {
		const provider = new FakeProvider([
			{ deltas: [{ channel: "text", text: "only" }], message: assistantText("only") },
		]);
		const controller = new AbortController();
		const events: StreamEvent[] = [];
		for await (const e of provider.stream(makeReq(), controller.signal)) {
			events.push(e);
			if (e.type === "text_delta") controller.abort();
		}
		expect(events).toEqual([{ type: "text_delta", text: "only" }, abortedDone]);
	});

	it("an exhausted script with an aborted signal yields aborted, not error", async () => {
		const provider = new FakeProvider([]);
		const controller = new AbortController();
		controller.abort();
		const events: StreamEvent[] = [];
		for await (const e of provider.stream(makeReq(), controller.signal)) {
			events.push(e);
		}
		expect(events).toEqual([abortedDone]);
	});
});
