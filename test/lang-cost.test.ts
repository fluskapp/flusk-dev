/**
 * A cap nobody meters is not a cap. `--max-cost` and `budgets.maxCostUsd` both
 * rest on this file pricing every call, so what it must never do is answer
 * zero: a step priced at nothing is a run that can spend without limit.
 */
import { expect, it } from "vitest";
import { costOf, DEFAULT_RATE, rateFor, usageFrom, usageOf } from "../src/lang/price.js";

const choice = (id: string) => ({ provider: "anthropic", id });

it("prices the Claude line by family, and cache reads a tenth of input", () => {
	expect(rateFor(choice("claude-opus-5"))).toEqual({ input: 5, output: 25, cacheRead: 0.5 });
	expect(rateFor(choice("claude-sonnet-5"))).toEqual({ input: 3, output: 15, cacheRead: 0.3 });
	expect(rateFor(choice("claude-haiku-4-5"))).toEqual({ input: 1, output: 5, cacheRead: 0.1 });
});

it("prices an unknown model at the default rather than at nothing", () => {
	expect(rateFor(choice("some-local-gguf"))).toEqual(DEFAULT_RATE);
	expect(
		costOf(choice("some-local-gguf"), { input: 1000, output: 1000, cacheRead: 0 }),
	).toBeGreaterThan(0);
});

it("computes dollars from tokens", () => {
	// 1M in + 1M out on Opus rates: $5 + $25.
	const bill = costOf(choice("claude-opus-5"), { input: 1e6, output: 1e6, cacheRead: 0 });
	expect(bill).toBeCloseTo(30);
	const cached = costOf(choice("claude-opus-5"), { input: 0, output: 0, cacheRead: 1e6 });
	expect(cached).toBeCloseTo(0.5);
});

it("reads usage off the reply when the provider reports it", () => {
	const reply = {
		content: "hi",
		usage_metadata: {
			input_tokens: 1200,
			output_tokens: 300,
			input_token_details: { cache_read: 200 },
		},
	};
	// Cache reads are billed separately, so they come OUT of the input count.
	expect(usageFrom(reply)).toEqual({ input: 1000, output: 300, cacheRead: 200 });
	expect(usageOf(reply, "prompt", "answer")).toEqual({ input: 1000, output: 300, cacheRead: 200 });
});

it("estimates both sides when the backend is quiet about tokens", () => {
	expect(usageFrom({ content: "hi" })).toBeNull();
	expect(usageFrom({ content: "hi", usage_metadata: {} })).toBeNull();
	const estimated = usageOf(
		{ content: "hi" },
		"a fairly long prompt about retries",
		"a short answer",
	);
	expect(estimated.input).toBeGreaterThan(0);
	expect(estimated.output).toBeGreaterThan(0);
	expect(costOf(choice("claude-opus-5"), estimated)).toBeGreaterThan(0);
});
