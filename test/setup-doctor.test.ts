/**
 * Doctor and maintain against a scratch home: checks report honestly, the
 * verdicts land as Setup: facts, and the maintenance tick refreshes the
 * index and sweeps the store without letting one sore step stop the rest.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createFactStore } from "../src/features/facts/facts.repository.js";
import { FLUSK_NS } from "../src/features/facts/namespaces.js";
import { maintainTick } from "../src/features/setup/maintain.js";
import { recordDoctor, runChecks } from "../src/features/setup/doctor.js";
import { checkIndex, checkStoreLocks } from "../src/features/setup/checks.repository.js";
import { saveIndex } from "../src/features/history/index-store.repository.js";
import { fluskHome } from "../src/platform/paths/paths.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

beforeEach(async () => {
	await setupTestHome("flusk-doctor-");
});
afterEach(() => teardownTestHome());

it("checks report status, detail and a fix; the verdict is the worst present", () => {
	const report = runChecks();
	expect(report.checks.length).toBeGreaterThanOrEqual(6);
	for (const c of report.checks) {
		expect(c.detail).not.toBe("");
		if (c.status !== "ok") expect(c.fix).toBeDefined();
	}
	const statuses = new Set(report.checks.map((c) => c.status));
	if (statuses.has("fail")) expect(report.verdict).toBe("fail");
	else if (statuses.has("warn")) expect(report.verdict).toBe("warn");
	else expect(report.verdict).toBe("ok");
});

it("a fresh home has no index and no stale locks — and says so", () => {
	expect(checkIndex().status).toBe("warn");
	expect(checkStoreLocks().status).toBe("ok");
	// A stale lock is a FAIL with the exact rm as its fix.
	const dir = join(fluskHome(), "store");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "flusk-abc.jsonl.lock"), "pid");
	const stale = checkStoreLocks(Date.now() + 11 * 60_000);
	expect(stale.status).toBe("fail");
	expect(stale.fix).toContain("rm ");
});

it("doctor verdicts land as one functional Setup: fact per check", async () => {
	const store = createFactStore();
	await recordDoctor(store, FLUSK_NS, runChecks());
	await recordDoctor(store, FLUSK_NS, runChecks()); // idempotent by supersede
	const rows = await store.query(FLUSK_NS, { predicate: "status" });
	const subjects = rows.map((f) => f.subject);
	expect(subjects).toContain("Setup:node");
	expect(subjects).toContain("Setup:index");
	// One LIVE row per check even after two doctors: supersede, not accumulate.
	expect(new Set(subjects).size).toBe(subjects.length);
});

it("maintain runs every step even when one is sore, and reports each", async () => {
	const store = createFactStore();
	// A fresh index so the index step has something to do.
	saveIndex({ cards: [], builtAt: new Date().toISOString(), stamps: {} });
	const report = await maintainTick(store);
	const names = report.steps.map((s) => s.name);
	expect(names).toEqual(["doctor", "index", "sweep"]);
	for (const s of report.steps) expect(s.detail).not.toBe("");
	// The tick's own verdict is the AND of its steps.
	expect(report.ok).toBe(report.steps.every((s) => s.ok));
});
