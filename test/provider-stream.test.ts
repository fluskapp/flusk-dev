import { describe, expect, it } from "vitest";
import { PiAiProvider } from "../src/provider/pi-ai.js";
import type { CompletionRequest, StreamEvent } from "../src/provider/provider.js";

describe("PiAiProvider never throws", () => {
	async function collect(req: CompletionRequest, signal: AbortSignal): Promise<StreamEvent[]> {
		const provider = new PiAiProvider();
		const events: StreamEvent[] = [];
		for await (const e of provider.stream(req, signal)) events.push(e);
		return events;
	}

	const bogusReq: CompletionRequest = {
		model: { provider: "anthropic", id: "not-a-real-model", contextWindow: 1000 },
		system: "s",
		messages: [{ role: "user", content: "hi" }],
		tools: [],
	};

	it("yields done-with-error for a bogus model id", async () => {
		const events = await collect(bogusReq, new AbortController().signal);
		expect(events).toHaveLength(1);
		const [done] = events;
		if (done?.type !== "done") throw new Error("expected done");
		expect(done.message.stopReason).toBe("error");
		expect(done.message.errorMessage).toContain("not-a-real-model");
	});

	it("yields done-with-error for a bogus provider", async () => {
		const events = await collect(
			{ ...bogusReq, model: { provider: "no-such-provider", id: "x", contextWindow: 1 } },
			new AbortController().signal,
		);
		const [done] = events;
		if (done?.type !== "done") throw new Error("expected done");
		expect(done.message.stopReason).toBe("error");
	});

	it("reports aborted when the signal already fired", async () => {
		const ac = new AbortController();
		ac.abort();
		const events = await collect(bogusReq, ac.signal);
		const [done] = events;
		if (done?.type !== "done") throw new Error("expected done");
		expect(done.message.stopReason).toBe("aborted");
	});
});
