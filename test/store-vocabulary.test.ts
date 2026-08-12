/**
 * The invariant src/store/facts.ts states about itself: it is the one place a
 * cardinality is decided. That claim is only worth anything if it is checked —
 * a table nobody consults looks authoritative and silently is not, and the
 * cost of trusting it is invisible (a functional flag on `depends_on` drops
 * every dependency edge but the last, and no read reports an error).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";
import { goal, task } from "../src/features/goals/schema.js";
import { fact } from "../src/features/facts/facts.js";
import { runFact } from "../src/features/verify/run-facts.js";
import { type Harness, harness, NS } from "./store-harness.js";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const VOCABULARY_FILE = join(SRC, "store", "facts.ts");

function sources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) return sources(full);
		return name.endsWith(".ts") ? [full] : [];
	});
}

let h: Harness;

beforeEach(async () => {
	h = await harness();
});

afterEach(async () => {
	await h.cleanup();
});

it("no module outside the vocabulary sets a cardinality of its own", () => {
	// `coexist:` in an assert literal is a second declaration of the answer,
	// and the two copies only have to disagree once.
	const offenders = sources(SRC).filter(
		(file) => file !== VOCABULARY_FILE && readFileSync(file, "utf8").includes("coexist:"),
	);
	expect(offenders).toEqual([]);
});

it("the table decides what the goal graph and a run's facts actually write", async () => {
	// Every builder derives its flag from the table, so these assertions fail
	// the moment a row is changed — which is the point: the row IS the answer.
	expect(task.dependsOn("t1", "t2").coexist).toBe(true);
	expect(task.status("t1", "done").coexist).toBeUndefined();
	expect(goal.hasTask("g1", "t1").coexist).toBe(true);
	expect(runFact.verifiedBy("r1", "npm test").coexist).toBe(true);
	expect(runFact.outcome("r1", "completed").coexist).toBeUndefined();

	await h.store.transact(NS, [task.dependsOn("t1", "t2")]);
	await h.store.transact(NS, [task.dependsOn("t1", "t3")]);
	const deps = await h.store.query(NS, { subject: "Task:t1", predicate: "depends_on" });
	expect(deps.map((f) => f.object).sort()).toEqual(["Task:t2", "Task:t3"]);
});

it("a predicate with no row is refused rather than guessed at", () => {
	expect(() => fact("Task:t1", "invented_predicate", "x")).toThrow(/no vocabulary row/);
	expect(() => fact("Unknown:t1", "status", "done")).toThrow(/no vocabulary row/);
});
