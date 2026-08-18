import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runFeed } from "../src/features/projects/run-feed.js";
import { journal, session, tree, write } from "./project-fixture.js";

const S1_AT = 1_786_388_400; // 2026-08-10T19:00:00Z
const S2_AT = 1_786_381_200; // 2026-08-10T17:00:00Z
/** The feed's clock is INJECTED: liveness is judged against the last write, so
 * a fixture's "running" row only reads running while the clock is near it. */
const NOW = Date.parse("2026-08-09T19:00:00.000Z");
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
		cost: "0.42",
	});

	write(work, "plain/README.md", "# plain\n", 1_000);
	session({ repoRoot: join(work, "plain"), task: "newer session", costUsd: 0.5, atSec: S1_AT });
	session({ repoRoot: join(work, "plain"), task: "older session", costUsd: 0.25, atSec: S2_AT });
});

afterAll(() => t.cleanup());

it("merges sessions and journals into one newest-first feed", () => {
	const rows = runFeed(t.cfg, {}, NOW);
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
	const rows = runFeed(t.cfg, {}, NOW);
	const live = rows[0];
	expect(live?.progress).toBe("1/2 · gate");
	expect(live?.status).toBe("running");
	expect(live?.id).toBe("2026-08-10-live");
	expect(live?.ref).toBe(join(t.work, "linof", "docs", "runs", "2026-08-10-live.md"));
	expect(live?.costUsd).toBeUndefined();

	const done = rows[2];
	expect(done?.progress).toBeUndefined(); // a journal with no stages block
	expect(done?.costUsd).toBeCloseTo(0.42);

	const newer = rows[1];
	expect(newer?.costUsd).toBeCloseTo(0.5);
	expect(newer?.at).toBe("2026-08-10T19:00:00.000Z");
	expect(newer?.ref.endsWith(".jsonl")).toBe(true);
	expect(newer?.status).toBe("completed");
});

it("filters by project and honours the limit", () => {
	expect(runFeed(t.cfg, { project: "linof" }, NOW).map((r) => r.kind)).toEqual([
		"journal",
		"journal",
	]);
	expect(runFeed(t.cfg, { project: "plain" }, NOW).map((r) => r.title)).toEqual([
		"newer session",
		"older session",
	]);
	expect(runFeed(t.cfg, { project: "nobody" }, NOW)).toEqual([]);
	expect(runFeed(t.cfg, { limit: 2 }, NOW).map((r) => r.title)).toEqual([
		"half done",
		"newer session",
	]);
	expect(runFeed(t.cfg, { limit: 0 }, NOW)).toEqual([]);
});

// The new attn fixtures land in this suite's own beforeAll — after the exact
// whole-feed assertions above have run — so those stay untouched.
describe("verdict and filesTouched", () => {
	beforeAll(() => {
		write(t.work, "attn/README.md", "# attn\n");
		const repoRoot = join(t.work, "attn");
		session({ repoRoot, task: "touched two", files: ["a.ts", "b.ts"], atSec: S1_AT });
		session({ repoRoot, task: "gate said no", gate: "blocked", atSec: S2_AT });
	});

	it("a completed session carries verdict ok and its distinct file count", () => {
		const row = runFeed(t.cfg, { project: "attn" }, NOW).find((r) => r.title === "touched two");
		expect(row?.verdict).toBe("ok");
		expect(row?.filesTouched).toBe(2);
	});

	it("a gate-blocked session reads blocked/warn — the D2 fold through the feed", () => {
		const row = runFeed(t.cfg, { project: "attn" }, NOW).find((r) => r.title === "gate said no");
		expect(row?.status).toBe("blocked");
		expect(row?.verdict).toBe("warn");
	});

	it("journal rows derive their verdict from the frontmatter status", () => {
		const rows = runFeed(t.cfg, { project: "linof" }, NOW);
		expect(rows.find((r) => r.status === "running")?.verdict).toBe("live");
		expect(rows.find((r) => r.status === "done")?.verdict).toBe("ok");
	});

	it("a session that touched nothing carries filesTouched 0, not undefined", () => {
		const rows = runFeed(t.cfg, { project: "plain" }, NOW);
		expect(rows.map((r) => r.filesTouched)).toEqual([0, 0]);
	});
});

// Last on purpose: an orphan session would perturb the whole-feed lists above.
describe("live rows and the project-less group", () => {
	beforeAll(() => {
		// A running session whose repoRoot no configured projectDir contains —
		// and OLDER than everything else, so a date-sorted cap would cut it.
		session({
			repoRoot: join(t.home, "stray-repo"),
			task: "orphan running",
			open: true,
			atSec: 1_786_300_000, // 2026-08-09T18:26:40Z
		});
	});

	it("surfaces an unconfigured repoRoot as (no project) instead of dropping it", () => {
		const row = runFeed(t.cfg, {}, NOW).find((r) => r.title === "orphan running");
		expect(row?.project).toBe("(no project)");
		expect(row?.status).toBe("running");
	});

	it("hoists running rows ahead of the cap — live work is never cut", () => {
		expect(runFeed(t.cfg, { limit: 2 }, NOW).map((r) => r.title)).toEqual([
			"half done",
			"orphan running",
		]);
	});
});
