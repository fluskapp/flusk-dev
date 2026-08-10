import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, test } from "vitest";
import { feedbackCmd } from "../src/cli/feedback-cmd.js";
import { runsCmd } from "../src/cli/runs-cmd.js";
import { assistantText } from "../src/provider/fake.js";
import { scoresPath, type Scores } from "../src/provider/scores.js";
import { Session } from "../src/session/session.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { fakeModel, setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("hit-cli-fb-");
}, SLOW);
afterEach(() => teardownTestHome(), SLOW);

test("feedback nudges benchmarks.json for the newest session's kind and model, printing old → new", async () => {
	const s = Session.create({ task: "fix the tests", repoRoot: repo, model: fakeModel, taskKind: "code" });
	s.appendStats(
		{ turns: 1, usage: { input: 1, output: 1, cacheRead: 0, costUsd: 0.01 }, startedAt: "2026-08-10T00:00:00.000Z" },
		"completed",
	);
	s.close();

	const good = capture();
	await feedbackCmd({ good: true, out: good.out });
	expect(good.text()).toContain("good → code fake/fake-1: 0.50 → 0.55");
	let onDisk = JSON.parse(await readFile(scoresPath(), "utf8")) as Scores;
	expect(onDisk.code?.["fake/fake-1"]).toBeCloseTo(0.55);

	const bad = capture();
	await feedbackCmd({ good: false, out: bad.out });
	expect(bad.text()).toContain("bad → code fake/fake-1: 0.55 → 0.45");
	onDisk = JSON.parse(await readFile(scoresPath(), "utf8")) as Scores;
	expect(onDisk.code?.["fake/fake-1"]).toBeCloseTo(0.45);
}, SLOW);

test("feedback scores the newest kinded ROOT session, skipping kindless runs and subagent sessions", async () => {
	const mk = (task: string, iso: string, o: { kind?: string; parent?: string; id?: string }) => {
		Session.create({
			task,
			repoRoot: repo,
			model: o.id !== undefined ? { provider: "fake", id: o.id, contextWindow: 200_000 } : fakeModel,
			...(o.kind !== undefined ? { taskKind: o.kind } : {}),
			...(o.parent !== undefined ? { parentSession: o.parent } : {}),
			now: new Date(iso),
		}).close();
	};
	mk("older kinded run", "2026-08-10T00:00:00.000Z", { kind: "code" });
	mk("newest kinded root run", "2026-08-10T01:00:00.000Z", { kind: "plan", id: "fake-2" });
	mk("newer but kindless", "2026-08-10T02:00:00.000Z", {});
	mk("newest of all: a kinded subagent", "2026-08-10T03:00:00.000Z", { kind: "review", parent: "p1" });

	const cap = capture();
	await feedbackCmd({ good: true, out: cap.out });
	// Not the older "code" run, not the kindless run, not the subagent's "review".
	expect(cap.text()).toContain("good → plan fake/fake-2: 0.50 → 0.55");
}, SLOW);

test("feedback with no scoreable session fails with a clear error", async () => {
	await expect(feedbackCmd({ good: true, out: capture().out })).rejects.toThrow(/no session/);
}, SLOW);

test("runs renders a table and prefers the persisted stats reason for status", async () => {
	const usage = { input: 1, output: 1, cacheRead: 0, costUsd: 0.1234 };
	const done = Session.create({
		task: "short task",
		repoRoot: repo,
		model: fakeModel,
		now: new Date("2026-08-10T10:00:00.000Z"),
	});
	done.appendMessage(assistantText("bye"));
	done.appendStats({ turns: 1, usage, startedAt: "2026-08-10T10:00:00.000Z" }, "completed");
	done.close();
	// Last assistant says stopReason "end", but the run actually hit its budget:
	// the persisted reason must win over the old stopReason derivation.
	const capped = Session.create({
		task: "a very long task name that surely exceeds the table's truncation width",
		repoRoot: repo,
		model: fakeModel,
		now: new Date("2026-08-10T11:00:00.000Z"),
	});
	capped.appendMessage(assistantText("wrap-up"));
	capped.appendStats({ turns: 2, usage, startedAt: "2026-08-10T11:00:00.000Z" }, "budget");
	capped.close();

	const cap = capture();
	runsCmd({ limit: 20, out: cap.out });
	const lines = cap.text().trimEnd().split("\n");
	expect(lines[0]).toMatch(/^TIME\s+STATUS\s+TURNS\s+COST\s+TASK\s+ID$/);
	expect(lines).toHaveLength(3);
	expect(lines[1]).toContain("2026-08-10 11:00");
	expect(lines[1]).toContain("stopped"); // from StatsEntry.reason "budget"
	expect(lines[1]).toContain("…"); // task truncated
	expect(lines[1]).toContain(capped.id);
	expect(lines[2]).toContain("completed");
	expect(lines[2]).toContain("short task");
	expect(lines[2]).toContain("$0.12");
	expect(lines[2]).toContain(done.id);

	const empty = capture();
	runsCmd({ limit: 1, out: empty.out });
	expect(empty.text().trimEnd().split("\n")).toHaveLength(2); // header + 1 row
}, SLOW);

test("runs with an empty home prints a friendly line", () => {
	const cap = capture();
	runsCmd({ out: cap.out });
	expect(cap.text()).toBe("no runs recorded\n");
}, SLOW);
