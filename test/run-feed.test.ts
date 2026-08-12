import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { runFeed } from "../src/features/projects/run-feed.js";
import { journal, session, tree, write } from "./project-fixture.js";

const S1_AT = 1_786_388_400; // 2026-08-10T19:00:00Z
const S2_AT = 1_786_381_200; // 2026-08-10T17:00:00Z
let t: ReturnType<typeof tree>;

beforeAll(() => {
	t = tree();
	const { work } = t;
	write(work, "linof/bin/linof.js", "\n");
	write(work, "linof/src/pipeline.js", "\n");
	write(work, "linof/config.json", "{}");
	journal(
		join(work, "linof"),
		"2026-08-10-live",
		{ title: '"Run: half done"', date: "2026-08-10T20:00:00.000Z", status: "running" },
		[
			["intent", "done|1s|code"],
			["gate", "running|0s|waiting"],
		],
	);
	journal(join(work, "linof"), "2026-08-10-old", {
		title: '"Run: finished"',
		date: "2026-08-10T18:00:00.000Z",
		status: "done",
	});

	write(work, "plain/README.md", "# plain\n", 1_000);
	session({ repoRoot: join(work, "plain"), task: "newer session", costUsd: 0.5, atSec: S1_AT });
	session({ repoRoot: join(work, "plain"), task: "older session", costUsd: 0.25, atSec: S2_AT });
});

afterAll(() => t.cleanup());

it("merges sessions and journals into one newest-first feed", () => {
	const rows = runFeed(t.cfg);
	expect(rows.map((r) => r.title)).toEqual([
		"half done",
		"newer session",
		"finished",
		"older session",
	]);
	expect(rows.map((r) => r.kind)).toEqual(["journal", "session", "journal", "session"]);
	expect(rows.map((r) => r.project)).toEqual(["linof", "plain", "linof", "plain"]);
});

it("gives journals stage progress and sessions their cost", () => {
	const rows = runFeed(t.cfg);
	const live = rows[0];
	expect(live?.progress).toBe("1/2 · gate");
	expect(live?.status).toBe("running");
	expect(live?.id).toBe("2026-08-10-live");
	expect(live?.ref).toBe(join(t.work, "linof", "docs", "runs", "2026-08-10-live.md"));
	expect(live?.costUsd).toBeUndefined();

	const done = rows[2];
	expect(done?.progress).toBeUndefined(); // a journal with no stages block

	const newer = rows[1];
	expect(newer?.costUsd).toBeCloseTo(0.5);
	expect(newer?.at).toBe("2026-08-10T19:00:00.000Z");
	expect(newer?.ref.endsWith(".jsonl")).toBe(true);
	expect(newer?.status).toBe("completed");
});

it("filters by project and honours the limit", () => {
	expect(runFeed(t.cfg, { project: "linof" }).map((r) => r.kind)).toEqual(["journal", "journal"]);
	expect(runFeed(t.cfg, { project: "plain" }).map((r) => r.title)).toEqual([
		"newer session",
		"older session",
	]);
	expect(runFeed(t.cfg, { project: "nobody" })).toEqual([]);
	expect(runFeed(t.cfg, { limit: 2 }).map((r) => r.title)).toEqual(["half done", "newer session"]);
	expect(runFeed(t.cfg, { limit: 0 })).toEqual([]);
});
