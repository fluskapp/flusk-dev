import { appendFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { nsPath, storeDir } from "../src/store/paths.js";
import { createFactStore } from "../src/store/store.js";
import { sweepTransient } from "../src/store/sweep.js";
import { type Harness, HOUR, harness, iso, NS, T0 } from "./store-harness.js";

/** A second namespace, to prove isolation is by namespace and not by luck. */
const OTHER_NS = "repo:other-0badf00d";

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
	delete process.env.FLUSK_HOME;
});

it("a line truncated by a killed process costs that line only", async () => {
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "test_cmd", object: "vitest" }]);
	h.at(T0 + 1000);
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "lint_cmd", object: "biome" }]);
	// Exactly what a process killed mid-write leaves behind: half a record and
	// no newline.
	await appendFile(h.logPath(NS), '{"k":"fact","tx":3,"fact":{"id":"x","subj');

	const rows = await h.store.query(NS, {});
	expect(rows.map((f) => f.object)).toEqual(["vitest", "biome"]);

	// And the store keeps taking writes on top of the damaged tail.
	h.at(T0 + 2000);
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "fmt_cmd", object: "biome" }]);
	expect(await h.store.query(NS, {})).toHaveLength(3);
});

it("an unreadable line anywhere in the log is skipped, not fatal", async () => {
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "test_cmd", object: "vitest" }]);
	await appendFile(h.logPath(NS), 'not json at all\n\n{"k":"fact","tx":2}\n{"k":"close"}\n');
	h.at(T0 + 1000);
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "lint_cmd", object: "biome" }]);
	expect((await h.store.query(NS, {})).map((f) => f.object)).toEqual(["vitest", "biome"]);
});

it("namespaces never see each other, for reads, supersession or guards", async () => {
	await h.store.transact(NS, [{ subject: "Repo:flusk", predicate: "test_cmd", object: "vitest" }]);
	h.at(T0 + 1000);
	await h.store.transact(OTHER_NS, [
		{ subject: "Repo:flusk", predicate: "test_cmd", object: "npm test" },
	]);

	expect((await h.store.query(NS, {})).map((f) => f.object)).toEqual(["vitest"]);
	expect((await h.store.query(OTHER_NS, {})).map((f) => f.object)).toEqual(["npm test"]);
	// The second assert must not have closed the first: they are different facts.
	expect(await h.store.query(NS, { status: "superseded" })).toHaveLength(0);
	expect(h.logPath(NS)).not.toBe(h.logPath(OTHER_NS));
});

it("the default store lives under FLUSK_HOME, not in a second convention", async () => {
	const home = await mkdtemp(join(tmpdir(), "flusk-home-"));
	process.env.FLUSK_HOME = home;
	const store = createFactStore({ now: () => T0 });
	await store.transact("flusk", [
		{ subject: "Night:2026-01-01", predicate: "runs_count", object: "1" },
	]);

	const path = nsPath(storeDir(), "flusk");
	expect(path.startsWith(join(home, "store"))).toBe(true);
	expect(await readFile(path, "utf8")).toContain("runs_count");
	await rm(home, { recursive: true, force: true });
});

it("the sweeper takes expired transient rows only, and never before their time", async () => {
	await h.store.transact(NS, [
		{
			subject: "Item:gh-prs",
			predicate: "cooldown_until",
			object: iso(T0 + HOUR),
			validUntil: iso(T0 + HOUR),
			transient: true,
		},
	]);
	await h.store.transact(NS, [
		{
			subject: "Run:1",
			predicate: "outcome",
			object: "completed",
			validUntil: iso(T0 + HOUR),
		},
	]);

	// Still valid: nothing may go, however transient it is.
	expect(await sweepTransient(NS, T0 + HOUR / 2, h.dir)).toBe(0);
	expect(await h.store.query(NS, { asOf: T0 + HOUR / 2 })).toHaveLength(2);

	expect(await sweepTransient(NS, T0 + 2 * HOUR, h.dir)).toBe(1);
	const log = await readFile(h.logPath(NS), "utf8");
	expect(log).not.toContain("cooldown_until");
	// The durable row survives, and the swept row does not come back to life:
	// readers decide expiry from the timestamp, never from presence.
	expect(log).toContain("outcome");
	expect(await h.store.query(NS, { asOf: T0 + HOUR / 2 })).toHaveLength(1);
	expect(await h.store.query(NS, { asOf: T0 + 2 * HOUR })).toHaveLength(0);
});

it("a swept fact leaves no orphan that could resurrect it", async () => {
	await h.store.transact(NS, [
		{
			subject: "Item:x",
			predicate: "cooldown_until",
			object: iso(T0 + HOUR),
			validUntil: iso(T0 + HOUR),
			transient: true,
		},
	]);
	h.at(T0 + 60_000);
	await h.store.transact(NS, [
		{
			subject: "Item:x",
			predicate: "cooldown_until",
			object: iso(T0 + 2 * HOUR),
			validUntil: iso(T0 + 2 * HOUR),
			transient: true,
		},
	]);
	expect(await sweepTransient(NS, T0 + 90 * 60_000, h.dir)).toBe(1);
	const rows = await h.store.query(NS, { status: "active,candidate,superseded", asOf: T0 + 1 });
	expect(rows).toHaveLength(0);
	expect(await h.store.query(NS, { asOf: T0 + 90 * 60_000 })).toHaveLength(1);
});
