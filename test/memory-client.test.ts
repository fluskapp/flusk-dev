import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MemoryClient } from "../src/memory/client-types.js";
import { createMemoryClient } from "../src/memory/client.js";
import { goalFact, isVocabularyPredicate, repoFact, runFact, taskFact, watchFact } from "../src/memory/facts.js";
import { HIT_NS, LESSONS_NS, repoNs, resolveNamespace } from "../src/memory/namespaces.js";
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

describe("memory client transport", () => {
	it("stamps the tenant on writes and filters reads per namespace", async () => {
		await mem.transact("repo:a", [runFact.outcome("r1", "completed")]);
		await mem.transact("repo:b", [runFact.outcome("r1", "failed")]);
		const a = await mem.query("repo:a", { subject: "Run:r1" });
		const b = await mem.query("repo:b", { subject: "Run:r1" });
		expect(a.map((f) => f.object)).toEqual(["completed"]);
		expect(b.map((f) => f.object)).toEqual(["failed"]);
		expect(mock.dump("repo:a").every((f) => f.tenant === "repo:a")).toBe(true);
	});

	it("supersedes functional predicates: only the newest assert stays active", async () => {
		const ns = "repo:supersede";
		await mem.transact(ns, [goalFact.status("g1", "planned")]);
		await mem.transact(ns, [goalFact.status("g1", "active")]);
		const active = await mem.query(ns, { subject: "Goal:g1", predicate: "status" });
		expect(active.map((f) => f.object)).toEqual(["active"]);
		const closed = mock.dump(ns).find((f) => f.object === "planned");
		expect(closed?.status).toBe("superseded");
		expect(typeof closed?.valid_until).toBe("number");
	});

	it("coexist predicates accumulate instead of superseding", async () => {
		const ns = "repo:coexist";
		expect(runFact.touched("r2", "a.ts").coexist).toBe(true);
		await mem.transact(ns, [runFact.touched("r2", "a.ts")]);
		await mem.transact(ns, [runFact.touched("r2", "b.ts")]);
		const facts = await mem.query(ns, { subject: "Run:r2", predicate: "touched" });
		expect(facts.map((f) => f.object).sort()).toEqual(["File:a.ts", "File:b.ts"]);
	});

	it("low-confidence facts land as candidate, hidden from active reads", async () => {
		const ns = "repo:candidate";
		await mem.transact(ns, [repoFact.convention("x", "tabs only", 0.5)]);
		expect(await mem.query(ns, { predicate: "convention" })).toEqual([]);
		const cands = await mem.query(ns, { predicate: "convention", status: "candidate" });
		expect(cands).toHaveLength(1);
		expect(cands[0]?.confidence).toBe(0.5);
	});

	it("compare-and-swap passes on the expected state and 409s on stale state", async () => {
		const ns = "repo:cas";
		await mem.transact(ns, [taskFact.status("t1", "pending")]);
		const guard = { subject: "Task:t1", predicate: "status", object: "pending" };
		await mem.transact(ns, [taskFact.status("t1", "running")], [guard]);
		await expect(
			mem.transact(ns, [taskFact.status("t1", "running")], [guard]),
		).rejects.toMatchObject({ status: 409, code: "CompareFailed" });
		const now = await mem.query(ns, { subject: "Task:t1", predicate: "status" });
		expect(now.map((f) => f.object)).toEqual(["running"]);
	});

	it("contextPack ranks by confidence and trims to the token budget", async () => {
		const ns = "repo:ctx";
		const pad = (s: string) => s.padEnd(40, ".");
		await mem.transact(ns, [repoFact.convention("c", pad("first"), 1.0)]);
		await mem.transact(ns, [repoFact.convention("c", pad("second"), 0.9)]);
		await mem.transact(ns, [repoFact.convention("c", pad("third"), 0.8)]);
		const facts = await mem.contextPack(ns, { goal: "conventions", tokenBudget: 32 });
		expect(facts.map((f) => f.confidence)).toEqual([1.0, 0.9]);
	});

	it("search returns only this namespace even though admin sees all tenants", async () => {
		await mem.transact("repo:s1", [repoFact.uses("s1", "vitest")]);
		await mem.transact("repo:s2", [repoFact.uses("s2", "vitest")]);
		const hits = await mem.search("repo:s1", "vitest");
		expect(hits).toHaveLength(1);
		expect(hits[0]?.subject).toBe("Repo:s1");
	});

	it("verifyClaims: ALLOW all-pass, WARN missing evidence, BLOCK contradiction", async () => {
		const ns = "repo:verify";
		await mem.transact(ns, [taskFact.status("v1", "running")]);
		const ok = { subject: "Task:v1", predicate: "status", expect: "running" };
		expect((await mem.verifyClaims(ns, [ok])).verdict).toBe("ALLOW");
		const missing = { subject: "Task:nope", predicate: "status", expect: "running" };
		expect((await mem.verifyClaims(ns, [ok, missing])).verdict).toBe("WARN");
		const wrong = { subject: "Task:v1", predicate: "status", expect: "done" };
		expect((await mem.verifyClaims(ns, [ok, wrong])).verdict).toBe("BLOCK");
	});

	it("health: true against the mock, false against a closed server", async () => {
		expect(await mem.health()).toBe(true);
		const dead = await startMockAbagraph();
		await dead.close();
		expect(await createMemoryClient({ baseUrl: dead.url }).health()).toBe(false);
	});
});

describe("namespaces and vocabulary", () => {
	it("derives repo:<slug>, honors the .hit.json override, exposes fixed namespaces", () => {
		expect(repoNs("/x/y/myrepo")).toMatch(/^repo:myrepo-[0-9a-f]{8}$/);
		expect(resolveNamespace("/x/y/myrepo")).toBe(repoNs("/x/y/myrepo"));
		expect(resolveNamespace("/x/y/myrepo", { namespace: "repo:custom" })).toBe("repo:custom");
		expect(LESSONS_NS).toBe("lessons");
		expect(HIT_NS).toBe("hit");
	});

	it("builders carry vocabulary flags; TTL ephemera are transient", () => {
		expect(goalFact.status("g", "planned").coexist).toBeUndefined();
		expect(goalFact.hasTask("g", "t").coexist).toBe(true);
		const cd = watchFact.cooldownUntil("k", "2026-08-10T00:00:00.000Z");
		expect(cd.transient).toBe(true);
		expect(cd.validUntil).toBe("2026-08-10T00:00:00.000Z");
		expect(cd.confidence).toBe(1);
	});

	it("isVocabularyPredicate accepts vocabulary rows and rejects strays", () => {
		expect(isVocabularyPredicate("Run", "touched")).toBe(true);
		expect(isVocabularyPredicate("ErrorClass", "fixed_by")).toBe(true);
		expect(isVocabularyPredicate("Run", "banana")).toBe(false);
		expect(isVocabularyPredicate("Repo", "status")).toBe(false);
	});
});
