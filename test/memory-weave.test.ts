import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { zeroUsage } from "../src/core/types.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { createMemoryClient } from "../src/memory/client.js";
import { buildMemoryBlock } from "../src/memory/contextpack.js";
import { digestRun } from "../src/memory/digestion.js";
import { makeExtractor } from "../src/memory/extraction.js";
import { lessonFact, repoFact } from "../src/memory/facts.js";
import { LESSONS_NS } from "../src/memory/namespaces.js";
import type { RunRecord } from "../src/memory/port.js";
import { assistantText, FakeProvider } from "../src/provider/fake.js";
import { fakeModel } from "./helpers.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

let mock: MockAbagraph;
let mem: MemoryClient;
beforeAll(async () => {
	mock = await startMockAbagraph();
	mem = createMemoryClient({ baseUrl: mock.url });
});
afterAll(async () => {
	await mock.close();
});

const budgets = { repo: 200, lessons: 200 };
const startedAt = "2026-08-10T00:00:00.000Z";
const stats = { turns: 1, usage: zeroUsage(), startedAt, endedAt: "2026-08-10T00:05:00.000Z" };

function makeRun(over: Partial<RunRecord> = {}): RunRecord {
	return {
		runId: "r1", sessionId: "s1", repoPath: "/repo", task: "fix tests", outcome: "completed",
		filesTouched: [], commandsRun: [], transcriptTail: [], stats,
		...over,
	};
}

describe("buildMemoryBlock", () => {
	it("returns null when both namespaces are empty", async () => {
		expect(await buildMemoryBlock(mem, { repoNs: "repo:empty", task: "t", budgets })).toBeNull();
	});

	it("renders repo facts then lessons in one <memory> block", async () => {
		await mem.transact("repo:weave", [repoFact.convention("weave", "tabs everywhere")]);
		await mem.transact(LESSONS_NS, [lessonFact.gotcha("vitest", "prefer port 0")]);
		const block = await buildMemoryBlock(mem, { repoNs: "repo:weave", task: "t", budgets });
		expect(block).toContain("<memory>");
		expect(block).toContain("Repo:weave convention tabs everywhere (conf 1)");
		expect(block).toContain("Tool:vitest gotcha prefer port 0 (conf 1)");
		expect(block?.indexOf("Repo:weave")).toBeLessThan(block?.indexOf("Tool:vitest") ?? -1);
	});

	it("respects the repo token budget: confidence-ranked greedy fill", async () => {
		const pad = (s: string) => s.padEnd(40, ".");
		await mem.transact("repo:budget", [repoFact.convention("b", pad("first"), 1)]);
		await mem.transact("repo:budget", [repoFact.convention("b", pad("second"), 0.9)]);
		const opts = { repoNs: "repo:budget", task: "t", budgets: { repo: 18, lessons: 1 } };
		const block = await buildMemoryBlock(mem, opts);
		expect(block).toContain("first");
		expect(block).not.toContain("second");
	});

	it("degrades to the surviving namespace; throws when both fail", async () => {
		const opts = { repoNs: "repo:weave", task: "t", budgets };
		const half: MemoryClient = {
			...mem,
			contextPack: (ns, req) =>
				ns === LESSONS_NS ? Promise.reject(new Error("down")) : mem.contextPack(ns, req),
		};
		const block = await buildMemoryBlock(half, opts);
		expect(block).toContain("Repo:weave");
		expect(block).not.toContain("Tool:vitest");
		const dead: MemoryClient = { ...mem, contextPack: () => Promise.reject(new Error("down")) };
		await expect(buildMemoryBlock(dead, opts)).rejects.toThrow("down");
	});
});

describe("digestRun", () => {
	const run = makeRun({
		outcome: "error",
		filesTouched: ["/r/a.ts", "/r/a.ts", "/r/b.ts"],
		commandsRun: [{ cmd: "npm test", exit: 0 }, { cmd: "npm test", exit: 0 }, { cmd: "boom", exit: 1 }],
		transcriptTail: [
			{ role: "toolResult", callId: "c1", name: "bash", output: "TypeError: nope\n at x", isError: true },
		],
	});

	it("writes exactly the vocabulary evidence trail, confidence 1, run source", async () => {
		await digestRun(mem, "repo:digest", run);
		const dump = mock.dump("repo:digest");
		expect(dump.map((f) => `${f.subject} ${f.predicate} ${f.object}`).sort()).toEqual([
			"Run:r1 failed_because TypeError: nope",
			"Run:r1 outcome error",
			"Run:r1 touched File:/r/a.ts",
			"Run:r1 touched File:/r/b.ts",
			"Run:r1 verified_by npm test",
			"Session:s1 ended_at 2026-08-10T00:05:00.000Z",
		]);
		// coexist rows (touched) stay simultaneously active
		const ok = dump.every((f) => f.confidence === 1 && f.source === "run:r1" && f.status === "active");
		expect(ok).toBe(true);
	});

	it("is idempotent: digesting the same run twice adds no duplicates", async () => {
		await digestRun(mem, "repo:digest", run);
		expect(mock.dump("repo:digest")).toHaveLength(6);
	});

	it("routes extracted lessons to the lessons namespace, capped and sourced", async () => {
		const text =
			'noise [{"subject":"Tool:vitest","predicate":"gotcha","object":"use port 0","confidence":0.95},' +
			'{"subject":"Tool:vitest","predicate":"banana","object":"x","confidence":0.6},' +
			'{"subject":"Repo:d2","predicate":"convention","object":"tabs","confidence":0.6}] done';
		const extractor = makeExtractor(new FakeProvider([{ message: assistantText(text) }]), fakeModel);
		await digestRun(mem, "repo:d2", makeRun({ runId: "r2" }), extractor);
		const lessons = mock.dump(LESSONS_NS).filter((f) => f.source === "digest:run:r2");
		expect(lessons).toHaveLength(1);
		expect(lessons[0]).toMatchObject({ predicate: "gotcha", confidence: 0.7, status: "candidate" });
		const repo = mock.dump("repo:d2").filter((f) => f.source === "digest:run:r2");
		expect(repo.map((f) => f.predicate)).toEqual(["convention"]);
	});

	it("extraction failure never fails digestion", async () => {
		const boom = async () => Promise.reject(new Error("llm down"));
		await expect(digestRun(mem, "repo:d3", makeRun({ runId: "r3" }), boom)).resolves.toBeUndefined();
		expect(mock.dump("repo:d3").some((f) => f.predicate === "outcome")).toBe(true);
	});
});

describe("makeExtractor", () => {
	it("drops non-vocabulary predicates, clamps confidence to 0.7, survives garbage", async () => {
		const text =
			'sure! [{"subject":"Approach:mock","predicate":"worked_for","object":"tests","confidence":0.9},' +
			'{"subject":"Run:r1","predicate":"banana","object":"x"},"garbage",' +
			'{"subject":"ErrorClass:enoent","predicate":"fixed_by","object":"mkdirp","confidence":0.4}] bye';
		const provider = new FakeProvider([{ message: assistantText(text) }]);
		expect(await makeExtractor(provider, fakeModel)(makeRun())).toEqual([
			{ subject: "Approach:mock", predicate: "worked_for", object: "tests", confidence: 0.7 },
			{ subject: "ErrorClass:enoent", predicate: "fixed_by", object: "mkdirp", confidence: 0.4 },
		]);
		const garbage = new FakeProvider([{ message: assistantText("no json here") }]);
		expect(await makeExtractor(garbage, fakeModel)(makeRun())).toEqual([]);
		expect(await makeExtractor(new FakeProvider([]), fakeModel)(makeRun())).toEqual([]);
	});
});
