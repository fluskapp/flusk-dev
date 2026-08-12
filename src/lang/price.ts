/**
 * What a flow step cost, in dollars.
 *
 * `--max-cost` and `budgets.maxCostUsd` are only real if something meters the
 * spend, and LangChain hands back token counts rather than a price — so this
 * file is the price. Usage is taken from the reply's own `usage_metadata` when
 * the provider reports it; when it does not, the prompt and the answer are
 * measured with the SAME estimator the composer budgets with, so a step is
 * never free merely because a backend is quiet about tokens.
 *
 * Rates are per MILLION tokens, matched on the model id. An unknown id gets the
 * default rather than zero: guessing high stops a run, guessing zero spends the
 * user's money uncapped, and only one of those is recoverable.
 */

import type { ModelChoice } from "../config/types.js";
import { estimateTokens } from "../history/budget.js";

export interface TokenUsage {
	input: number;
	output: number;
	cacheRead: number;
}

/** Dollars per million tokens: [input, output, cache read]. */
export interface Rate {
	input: number;
	output: number;
	cacheRead: number;
}

const MILLION = 1_000_000;

/** Cache reads bill at a tenth of the input rate across the Claude line. */
const at = (input: number, output: number): Rate => ({
	input,
	output,
	cacheRead: input / 10,
});

/**
 * Matched as substrings of the model id, FIRST HIT WINS — so the narrower
 * family names come before the ones they contain.
 */
const RATES: [string, Rate][] = [
	["haiku", at(1, 5)],
	["fable", at(10, 50)],
	["mythos", at(10, 50)],
	["opus", at(5, 25)],
	["sonnet", at(3, 15)],
];

/** Unknown model, unknown backend: priced as the mid tier. Guessing high stops
 * a run and the user re-runs; guessing zero spends their money uncapped. */
export const DEFAULT_RATE: Rate = at(3, 15);

export function rateFor(choice: ModelChoice): Rate {
	const id = choice.id.toLowerCase();
	return RATES.find(([key]) => id.includes(key))?.[1] ?? DEFAULT_RATE;
}

/**
 * LangChain's `usage_metadata`, when the provider filled it in. Shapes vary by
 * integration, so every field is read defensively and a missing one is 0.
 */
export function usageFrom(reply: unknown): TokenUsage | null {
	const meta = (reply as { usage_metadata?: Record<string, unknown> } | null)?.usage_metadata;
	if (typeof meta !== "object" || meta === null) return null;
	const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
	const details = (meta.input_token_details ?? {}) as Record<string, unknown>;
	const cacheRead = n(details.cache_read);
	const input = Math.max(0, n(meta.input_tokens) - cacheRead);
	const total = input + n(meta.output_tokens) + cacheRead;
	return total === 0 ? null : { input, output: n(meta.output_tokens), cacheRead };
}

/** Usage the provider reported, or the composer's own estimate of both sides. */
export function usageOf(reply: unknown, prompt: string, output: string): TokenUsage {
	return (
		usageFrom(reply) ?? {
			input: estimateTokens(prompt),
			output: estimateTokens(output),
			cacheRead: 0,
		}
	);
}

export function costOf(choice: ModelChoice, usage: TokenUsage): number {
	const rate = rateFor(choice);
	const dollars =
		usage.input * rate.input + usage.output * rate.output + usage.cacheRead * rate.cacheRead;
	return dollars / MILLION;
}
