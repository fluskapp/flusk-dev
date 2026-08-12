import { expect, test } from "vitest";
import { estimateTokens, findCutIndex, shouldCompact } from "../src/features/compaction/compact.js";
import type { Msg } from "../src/features/run/run.types.js";
import { assistantText, assistantToolCalls } from "../src/features/provider/fake.js";
import { toolResult, user } from "./compaction-helpers.js";

test("estimateTokens is chars/4 over serialized messages", () => {
	const msg = user("abcd");
	expect(estimateTokens([msg])).toBe(Math.ceil(JSON.stringify(msg).length / 4));
	expect(estimateTokens([])).toBe(0);
	expect(estimateTokens([msg, msg])).toBeGreaterThan(estimateTokens([msg]));
});

test("shouldCompact trips only above contextWindow minus reserve", () => {
	expect(shouldCompact(200, 1000, 800)).toBe(false);
	expect(shouldCompact(201, 1000, 800)).toBe(true);
});

test("findCutIndex keeps tool results attached to their assistant call", () => {
	const at = assistantToolCalls([
		{ id: "c1", name: "ping", args: {} },
		{ id: "c2", name: "ping", args: {} },
	]);
	const tail = [user("tail question"), assistantText("tail answer")];
	const msgs: Msg[] = [
		user("early ".repeat(40)),
		assistantText("early reply ".repeat(40)),
		at,
		toolResult("c1"),
		toolResult("c2"),
		...tail,
	];
	// nothing dropped when everything fits
	expect(findCutIndex(msgs, 1_000_000)).toBe(0);
	// keep budget covering exactly [tr, tr, user, assistant] cuts at the user boundary
	const e = (m: Msg) => estimateTokens([m]);
	const budget = e(msgs[3] as Msg) + e(msgs[4] as Msg) + e(msgs[5] as Msg) + e(msgs[6] as Msg);
	expect(findCutIndex(msgs, budget)).toBe(5);
	// for every budget, the cut never lands on a toolResult
	const total = estimateTokens(msgs);
	for (let k = 1; k <= total + 10; k += 7) {
		const cut = findCutIndex(msgs, k);
		expect(msgs[cut]?.role).not.toBe("toolResult");
	}
	// even when the newest message overflows the budget, the pair stays whole
	const overflow: Msg[] = [user("a"), at, toolResult("c1")];
	expect(findCutIndex(overflow, 1)).toBe(1);
});
