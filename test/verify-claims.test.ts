import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { zeroUsage } from "../src/core/types.js";
import type { MemoryClient } from "../src/memory/client-types.js";
import { createMemoryClient } from "../src/memory/client.js";
import { runFact } from "../src/memory/facts.js";
import type { RunRecord } from "../src/memory/port.js";
import { buildClaims, checkReport, TOUCHED_CLAIM_CAP } from "../src/verify/claims.js";
import type { VerifyCommandResult } from "../src/verify/gate.js";
import { type MockAbagraph, startMockAbagraph } from "./mock-abagraph.js";

function makeRun(runId: string, over: Partial<RunRecord> = {}): RunRecord {
	return {
		runId,
		sessionId: "s1",
		repoPath: "/repo",
		task: "fix the bug",
		outcome: "completed",
		filesTouched: [],
		commandsRun: [],
		transcriptTail: [],
		stats: { turns: 1, usage: zeroUsage(), startedAt: "2026-08-10T00:00:00.000Z" },
		...over,
	};
}

const pass = (cmd: string): VerifyCommandResult => ({ cmd, exitCode: 0, tail: "" });
const fail = (cmd: string): VerifyCommandResult => ({ cmd, exitCode: 1, tail: "boom" });
const skip = (cmd: string): VerifyCommandResult => ({ cmd, exitCode: -1, tail: "", skipped: true });

describe("buildClaims", () => {
	it("claims outcome=completed plus one verified_by per PASSING command", () => {
		const claims = buildClaims(makeRun("r1"), [pass("npm test"), fail("npm run lint"), skip("npm run build")]);
		expect(claims).toEqual([
			{ subject: "Run:r1", predicate: "outcome", expect: "completed", op: "eq" },
			{ subject: "Run:r1", predicate: "verified_by", expect: "npm test", op: "eq" },
		]);
	});

	it("claims touched per file, capped at 20", () => {
		const files = Array.from({ length: 25 }, (_, i) => `src/f${i}.ts`);
		const claims = buildClaims(makeRun("r2", { filesTouched: files }), []);
		const touched = claims.filter((c) => c.predicate === "touched");
		expect(TOUCHED_CLAIM_CAP).toBe(20);
		expect(touched).toHaveLength(20);
		expect(touched[0]?.expect).toBe("File:src/f0.ts");
		expect(touched[19]?.expect).toBe("File:src/f19.ts");
		expect(claims).toHaveLength(21);
	});
});

describe("checkReport against the mock server", () => {
	let mock: MockAbagraph;
	let mem: MemoryClient;
	beforeAll(async () => {
		mock = await startMockAbagraph();
		mem = createMemoryClient({ baseUrl: mock.url });
	});
	afterAll(async () => {
		await mock.close();
	});

	it("ALLOWs when the harness's own run facts back every claim", async () => {
		const ns = "repo:claims-allow";
		// Digestion wrote these BEFORE claim-checking — the record to check against.
		await mem.transact(ns, [
			runFact.outcome("r1", "completed"),
			runFact.verifiedBy("r1", "npm test"),
			runFact.touched("r1", "src/a.ts"),
		]);
		const run = makeRun("r1", { filesTouched: ["src/a.ts"] });
		const { verdict } = await checkReport(mem, ns, buildClaims(run, [pass("npm test")]));
		expect(verdict).toBe("ALLOW");
	});

	it("a fabricated tests-pass report cannot ALLOW: no verified_by fact exists", async () => {
		const ns = "repo:claims-fabricated";
		await mem.transact(ns, [runFact.outcome("r2", "completed")]);
		const { verdict, details } = await checkReport(
			mem,
			ns,
			buildClaims(makeRun("r2"), [pass("npm test")]),
		);
		expect(verdict).not.toBe("ALLOW");
		expect(details).toMatchObject({ decision: verdict });
	});

	it("BLOCKs when the recorded outcome contradicts the completion claim", async () => {
		const ns = "repo:claims-contradict";
		await mem.transact(ns, [
			runFact.outcome("r3", "failed"),
			runFact.verifiedBy("r3", "npm test"),
		]);
		const { verdict } = await checkReport(mem, ns, buildClaims(makeRun("r3"), [pass("npm test")]));
		expect(verdict).toBe("BLOCK");
	});
});
