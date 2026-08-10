/**
 * Memory end-to-end across two CLI runs: the first run digests facts into
 * abagraph (mock); the second run's FIRST provider request carries a
 * <memory> block built from them. Config flows through a temp HIT_HOME
 * config.json whose memory.baseUrl points at the mock server.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { FakeProvider } from "../src/provider/fake.js";
import { repoSlug } from "../src/session/paths.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

let repo: string;
let mock: MockAbagraph;
beforeEach(async () => {
	repo = await setupTestHome("hit-mem-e2e-");
	mock = await startMockAbagraph();
	const home = process.env.HIT_HOME as string;
	await mkdir(home, { recursive: true });
	await writeFile(
		join(home, "config.json"),
		JSON.stringify({ memory: { enabled: true, baseUrl: mock.url } }),
	);
}, SLOW);
afterEach(async () => {
	teardownTestHome();
	await mock.close();
}, SLOW);

test("second run's first request carries a <memory> block from the first run's facts", async () => {
	const spy = vi.spyOn(FakeProvider.prototype, "stream");
	try {
		const first = await runCmd({ task: "demo one", repo, quiet: true, out: capture().out });
		expect(first).toBe("completed");
		// Fresh namespace: the first run has nothing to weave in.
		expect(spy.mock.calls[0]?.[0]?.system).not.toContain("<memory>");
		const callsAfterFirst = spy.mock.calls.length;
		// Digestion landed harness-observed facts on the mock server.
		const ns = `repo:${repoSlug(repo)}`;
		expect(mock.dump(ns).some((f) => f.predicate === "outcome" && f.object === "completed")).toBe(true);

		const second = await runCmd({ task: "demo two", repo, quiet: true, out: capture().out });
		expect(second).toBe("completed");
		const req = spy.mock.calls[callsAfterFirst]?.[0];
		expect(req?.system).toContain("<memory>");
		expect(req?.system).toMatch(/<memory>[\s\S]*outcome completed[\s\S]*<\/memory>/);
		// The block is frozen to the first turn: later requests in the same run repeat it verbatim only via resume, never mid-run.
		const later = spy.mock.calls.slice(callsAfterFirst + 1).map((c) => c[0]?.system ?? "");
		for (const sys of later) expect(sys).not.toContain("<memory>");
	} finally {
		spy.mockRestore();
	}
}, SLOW);
