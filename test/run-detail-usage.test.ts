/**
 * Per-turn usage on the transcript wire: loadSessionDetail carries each
 * assistant turn's usage through, tolerates old files that never recorded
 * one, and cumulativeCosts prefix-sums exactly what the UI renders.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { loadSessionDetail } from "../src/features/projects/detail.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { cumulativeCosts } from "../src/ui/react/runs/format.js";
import { tree } from "./project-fixture.js";

const MODEL = { provider: "fake", id: "fake-1", contextWindow: 200_000 };

let t: ReturnType<typeof tree>;
let path: string;

beforeAll(() => {
	t = tree();
	const sess = Session.create({ task: "t", repoRoot: join(t.work, "p"), model: MODEL });
	sess.appendMessage({ role: "user", content: "t" });
	sess.appendMessage({
		role: "assistant",
		content: [{ type: "text", text: "a" }],
		stopReason: "end",
		usage: { input: 10, output: 5, cacheRead: 0, costUsd: 0.01 },
	});
	sess.appendMessage({
		role: "assistant",
		content: [{ type: "text", text: "b" }],
		stopReason: "end",
		usage: { input: 20, output: 9, cacheRead: 0, costUsd: 0.02 },
	});
	sess.close();
	path = sess.path;
});

afterAll(() => t.cleanup());

it("carries each assistant turn's usage onto the transcript item", () => {
	const detail = loadSessionDetail(path);
	const assistants = detail.items.filter((i) => i.kind === "assistant");
	expect(assistants).toHaveLength(2);
	expect(assistants[0]?.usage?.costUsd).toBe(0.01);
	expect(assistants[1]?.usage?.costUsd).toBe(0.02);
});

it("prefix-sums the same array the UI renders from", () => {
	const detail = loadSessionDetail(path);
	const cums = cumulativeCosts(detail.items);
	expect(cums[0]).toBeUndefined(); // the user turn
	expect(cums[1]).toBeCloseTo(0.01);
	expect(cums[2]).toBeCloseTo(0.03);
});

it("tolerates old files whose messages never recorded usage", () => {
	const stripped = readFileSync(path, "utf8")
		.trim()
		.split("\n")
		.map((line) => {
			const e = JSON.parse(line) as Record<string, unknown>;
			const msg = e.msg;
			if (typeof msg === "object" && msg !== null) {
				delete (msg as Record<string, unknown>).usage;
			}
			return JSON.stringify(e);
		});
	writeFileSync(path, `${stripped.join("\n")}\n`);
	const detail = loadSessionDetail(path);
	const assistants = detail.items.filter((i) => i.kind === "assistant");
	expect(assistants).toHaveLength(2);
	for (const a of assistants) expect("usage" in a).toBe(false);
	expect(cumulativeCosts(detail.items)).toEqual([undefined, undefined, undefined]);
});
