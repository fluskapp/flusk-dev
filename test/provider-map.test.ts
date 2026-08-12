import { describe, expect, it } from "vitest";
import type { AssistantMsg, Msg, StopReason } from "../src/features/run/run.types.js";
import { toPiContext } from "../src/features/provider/pi-ai-map.js";
import type { ToolSchemaJson } from "../src/features/provider/provider.js";
import type { PiStopReason } from "./provider-map-fixtures.js";

const hitMsgs: Msg[] = [
	{ role: "user", content: "do the thing" },
	{
		role: "assistant",
		content: [
			{ type: "thinking", text: "hmm" },
			{ type: "text", text: "on it" },
			{ type: "toolCall", id: "c1", name: "bash", args: { command: "ls" } },
		],
		stopReason: "toolUse",
		usage: { input: 10, output: 5, cacheRead: 2, costUsd: 0.01 },
	},
	{ role: "toolResult", callId: "c1", name: "bash", output: "README.md", isError: false },
];

const tools: ToolSchemaJson[] = [
	{
		name: "bash",
		description: "run a command",
		parameters: { type: "object", properties: { command: { type: "string" } } },
	},
];

describe("toPiContext", () => {
	it("maps flusk messages to pi shapes with timestamps", () => {
		const ctx = toPiContext("sys prompt", hitMsgs, tools);
		expect(ctx.systemPrompt).toBe("sys prompt");
		expect(ctx.messages).toHaveLength(3);
		const [user, assistant, result] = ctx.messages;
		expect(user).toMatchObject({ role: "user", content: "do the thing" });
		expect(typeof user?.timestamp).toBe("number");
		expect(assistant).toMatchObject({
			role: "assistant",
			stopReason: "toolUse",
			content: [
				{ type: "thinking", thinking: "hmm" },
				{ type: "text", text: "on it" },
				{ type: "toolCall", id: "c1", name: "bash", arguments: { command: "ls" } },
			],
		});
		if (assistant?.role !== "assistant") throw new Error("expected assistant");
		expect(assistant.usage.cost.total).toBe(0.01);
		expect(assistant.usage.input).toBe(10);
		expect(result).toMatchObject({
			role: "toolResult",
			toolCallId: "c1",
			toolName: "bash",
			content: [{ type: "text", text: "README.md" }],
			isError: false,
		});
	});

	it("passes tool schemas through verbatim and omits empty sections", () => {
		const ctx = toPiContext("sys", hitMsgs, tools);
		expect(ctx.tools).toHaveLength(1);
		expect(ctx.tools?.[0]?.name).toBe("bash");
		expect(ctx.tools?.[0]?.parameters).toBe(tools[0]?.parameters);
		const empty = toPiContext("", [], []);
		expect(empty.systemPrompt).toBeUndefined();
		expect(empty.tools).toBeUndefined();
	});

	it("round-trips assistant stopReasons flusk → pi", () => {
		const table: Array<[StopReason, PiStopReason]> = [
			["end", "stop"],
			["maxTokens", "length"],
			["toolUse", "toolUse"],
			["error", "error"],
			["aborted", "aborted"],
		];
		for (const [ours, pi] of table) {
			const msg: AssistantMsg = {
				role: "assistant",
				content: [],
				stopReason: ours,
				usage: { input: 0, output: 0, cacheRead: 0, costUsd: 0 },
			};
			const ctx = toPiContext("s", [msg], []);
			const mapped = ctx.messages[0];
			if (mapped?.role !== "assistant") throw new Error("expected assistant");
			expect(mapped.stopReason).toBe(pi);
		}
	});
});
