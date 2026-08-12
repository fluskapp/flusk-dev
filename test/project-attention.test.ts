import { expect, it } from "vitest";
import { medianSpend } from "../src/ui/project-attention.js";
import { ago, DAY, journal, MIN, NOW, run, session } from "./attention-fixture.js";

it("flags a failed or errored harness run, and nothing for a healthy one", () => {
	expect(run({ journals: [journal({ status: "failed", title: "Run: broke" })] })).toEqual([
		{ severity: "high", label: "run failed: broke", ref: "/w/linof/docs/runs/r.md" },
	]);
	expect(run({ journals: [journal({ status: "error" })] })[0]?.severity).toBe("high");
	expect(run({ journals: [journal({ status: "done" })] })).toEqual([]);
});

it("flags an flusk session that errored or was stopped, but not one that ran or aborted", () => {
	expect(run({ sessions: [session({ status: "error" })] })).toEqual([
		{ severity: "high", label: "session error: a task", ref: "plain-abcd1234/run.jsonl" },
	]);
	expect(run({ sessions: [session({ status: "stopped" })] })[0]?.severity).toBe("high");
	expect(run({ sessions: [session({ status: "aborted" })] })).toEqual([]);
	expect(run({ sessions: [session({ status: "running" })] })).toEqual([]);
});

it("flags a session that has been 'running' for over an hour", () => {
	// A session with no stats entry reads as running forever (scan.ts
	// deriveStatus), so one killed overnight must not stay silently "live".
	const stalled = session({ status: "running", updatedAtMs: NOW - 61 * MIN });
	expect(run({ sessions: [stalled] })).toEqual([
		{ severity: "high", label: "session stalled >60m: a task", ref: "plain-abcd1234/run.jsonl" },
	]);
	expect(run({ sessions: [session({ status: "running", updatedAtMs: NOW - 59 * MIN })] })).toEqual(
		[],
	);
});

it("drops anything nobody has touched in two days, so the list can reach zero", () => {
	const old = 3 * DAY;
	expect(run({ journals: [journal({ status: "failed", date: ago(old) })] })).toEqual([]);
	expect(run({ journals: [journal({ status: "blocked", date: ago(old) })] })).toEqual([]);
	expect(run({ sessions: [session({ status: "error", updatedAtMs: NOW - old })] })).toEqual([]);
	// ...and the same failure inside the window is still raised.
	expect(run({ journals: [journal({ status: "failed", date: ago(DAY) })] })).toHaveLength(1);
});

it("measures a stall from the last WRITE, not from the declared start date", () => {
	// A run that started 3h ago and appended a stage a minute ago is working.
	const busy = journal({ status: "running", date: ago(180 * MIN), mtimeMs: NOW - MIN });
	expect(run({ journals: [busy] })).toEqual([]);
});

it("flags a run whose newest stage failed even when the run says it is done", () => {
	const stages = [
		{ name: "verify", status: "done", duration: "1s", detail: "" },
		{ name: "gate", status: "failed", duration: "0s", detail: "claims unproven" },
	];
	expect(run({ journals: [journal({ stages })] })).toEqual([
		{ severity: "high", label: "stage gate failed: a thing", ref: "/w/linof/docs/runs/r.md" },
	]);
	stages[1] = { name: "gate", status: "done", duration: "0s", detail: "pass" };
	expect(run({ journals: [journal({ stages })] })).toEqual([]);
});

it("flags a run that has been running for over an hour, on the injected clock", () => {
	const stalled = journal({ status: "running", date: ago(61 * MIN) });
	expect(run({ journals: [stalled] })[0]).toEqual({
		severity: "high",
		label: "run stalled >60m: a thing",
		ref: "/w/linof/docs/runs/r.md",
	});
	expect(run({ journals: [journal({ status: "running", date: ago(59 * MIN) })] })).toEqual([]);
});

it("flags a blocked run at medium", () => {
	expect(run({ journals: [journal({ status: "blocked" })] })).toEqual([
		{ severity: "medium", label: "run blocked: a thing", ref: "/w/linof/docs/runs/r.md" },
	]);
});

it("flags live runs with no activity for a fortnight, pointing at the oldest", () => {
	const zombie = journal({ status: "running", date: ago(15 * DAY) });
	const stale = { journals: [zombie], liveRuns: 1, lastActivity: ago(15 * DAY) };
	// Every row must lead somewhere, so the rule names its own evidence.
	expect(run(stale)[0]).toEqual({
		severity: "medium",
		label: "live runs but nothing has moved in 14 days",
		ref: zombie.path,
	});
	expect(run({ ...stale, liveRuns: 0 })).toEqual([]); // stale but nothing in flight
	expect(run({ journals: [zombie], liveRuns: 1, lastActivity: ago(13 * DAY) })).toEqual([]);
});

it("flags spend over three times the median, and only when a median exists", () => {
	const pricey = session({ costUsd: 3.01 });
	expect(run({ sessions: [pricey], costUsd: 3.01 }, 1)[0]).toEqual({
		severity: "medium",
		label: "spend $3.01 is over 3× the median",
		ref: pricey.key, // the run the figure is mostly made of
	});
	expect(run({ sessions: [pricey], costUsd: 3 }, 1)).toEqual([]);
	// fewer than three spending projects
	expect(run({ sessions: [pricey], costUsd: 99 })).toEqual([]);
});

it("takes a median only from three or more spending projects", () => {
	expect(medianSpend([1, 2])).toBeUndefined();
	expect(medianSpend([1, 2, 0, 0])).toBeUndefined(); // zeros are not spend
	expect(medianSpend([5, 1, 3])).toBe(3);
	expect(medianSpend([1, 3, 5, 7])).toBe(4);
});

it("ranks high severity above medium", () => {
	const out = run(
		{
			journals: [journal({ status: "blocked" }), journal({ status: "failed" })],
			sessions: [session({ costUsd: 10 })],
			costUsd: 10,
		},
		1,
	);
	expect(out.map((a) => a.severity)).toEqual(["high", "medium", "medium"]);
});

it("keeps only the newest of a repeated failure", () => {
	// A harness that retried the same PR three times, newest journal first.
	const retried = ["r3.md", "r2.md", "r1.md"].map((f) =>
		journal({ status: "failed", title: "Run: review PR #127", path: `/w/linof/docs/runs/${f}` }),
	);
	const out = run({ journals: [...retried, journal({ status: "failed", title: "Run: other" })] });
	expect(out).toHaveLength(2);
	expect(out[0]?.ref).toBe("/w/linof/docs/runs/r3.md");
});
