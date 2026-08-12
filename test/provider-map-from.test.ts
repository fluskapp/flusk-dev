import { describe, expect, it } from "vitest";
import type { StopReason } from "../src/features/run/run.types.js";
import { fromPiEvent, fromPiMessage, fromPiStopReason, fromPiUsage } from "../src/features/provider/pi-ai-map.js";
import {
	type AssistantMessageEvent,
	piAssistant,
	type PiStopReason,
	piUsage,
} from "./provider-map-fixtures.js";

describe("fromPiMessage", () => {
	it("maps content blocks, stopReason, and usage", () => {
		const msg = fromPiMessage(
			piAssistant({
				content: [
					{ type: "thinking", thinking: "let me see" },
					{ type: "text", text: "answer" },
					{ type: "toolCall", id: "t9", name: "read", arguments: { path: "a.txt" } },
				],
				stopReason: "toolUse",
			}),
		);
		expect(msg.role).toBe("assistant");
		expect(msg.content).toEqual([
			{ type: "thinking", text: "let me see" },
			{ type: "text", text: "answer" },
			{ type: "toolCall", id: "t9", name: "read", args: { path: "a.txt" } },
		]);
		expect(msg.stopReason).toBe("toolUse");
		expect(msg.usage).toEqual({ input: 100, output: 20, cacheRead: 30, costUsd: 0.33 });
	});

	it("maps every pi stopReason to a flusk stopReason", () => {
		const table: Array<[PiStopReason, StopReason]> = [
			["stop", "end"],
			["length", "maxTokens"],
			["toolUse", "toolUse"],
			["error", "error"],
			["aborted", "aborted"],
			["pending", "error"],
			["deferred", "error"],
		];
		for (const [pi, flusk] of table) expect(fromPiStopReason(pi)).toBe(flusk);
	});

	it("maps pi usage to flusk usage via cost.total", () => {
		expect(fromPiUsage(piUsage())).toEqual({
			input: 100,
			output: 20,
			cacheRead: 30,
			costUsd: 0.33,
		});
	});
});

describe("fromPiEvent", () => {
	const partial = piAssistant();

	it("maps deltas, toolcall_end, and done", () => {
		expect(
			fromPiEvent({ type: "text_delta", contentIndex: 0, delta: "he", partial }),
		).toEqual({ type: "text_delta", text: "he" });
		expect(
			fromPiEvent({ type: "thinking_delta", contentIndex: 0, delta: "hm", partial }),
		).toEqual({ type: "thinking_delta", text: "hm" });
		expect(
			fromPiEvent({
				type: "toolcall_end",
				contentIndex: 1,
				toolCall: { type: "toolCall", id: "c2", name: "bash", arguments: { command: "pwd" } },
				partial,
			}),
		).toEqual({
			type: "toolcall",
			call: { type: "toolCall", id: "c2", name: "bash", args: { command: "pwd" } },
		});
		const done = fromPiEvent({ type: "done", reason: "stop", message: piAssistant() });
		expect(done).toMatchObject({ type: "done", message: { stopReason: "end" } });
	});

	it("maps the error event's message from its 'error' field", () => {
		const ev: AssistantMessageEvent = {
			type: "error",
			reason: "error",
			error: piAssistant({ stopReason: "error", errorMessage: "boom", content: [] }),
		};
		const mapped = fromPiEvent(ev);
		expect(mapped).toMatchObject({
			type: "done",
			message: { stopReason: "error", errorMessage: "boom" },
		});
	});

	it("returns null for bookkeeping events", () => {
		const nulls: AssistantMessageEvent[] = [
			{ type: "start", partial },
			{ type: "text_start", contentIndex: 0, partial },
			{ type: "text_end", contentIndex: 0, content: "hi", partial },
			{ type: "thinking_start", contentIndex: 0, partial },
			{ type: "thinking_end", contentIndex: 0, content: "hm", partial },
			{ type: "toolcall_start", contentIndex: 0, partial },
			{ type: "toolcall_delta", contentIndex: 0, delta: "{", partial },
		];
		for (const ev of nulls) expect(fromPiEvent(ev)).toBeNull();
	});
});
