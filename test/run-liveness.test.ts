/**
 * Liveness is VERIFIED, never claimed (src/features/run/liveness.ts).
 *
 * A crashed run never writes its stats entry and a dead orchestrator never
 * closes its journal frontmatter, so both say "running" for as long as the
 * files survive — the dashboard used to pulse a week-dead run as live work.
 * The rule is one hour since the last WRITE, and every surface counts with
 * it: the feed's rows, the project badge, the Overview tiles.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { flowRun } from "../src/features/flows/flow-runs.repository.js";
import { scanJournals } from "../src/features/projects/journal-scan.repository.js";
import { buildOverview } from "../src/features/projects/overview.js";
import { scanProjects } from "../src/features/projects/project-scan.repository.js";
import { runFeed } from "../src/features/projects/run-feed.js";
import { scanSessions } from "../src/features/projects/scan.repository.js";
import { ageStatus, isLive, STALL_MS } from "../src/features/run/liveness.js";
import { journal, session, tree, write } from "./project-fixture.js";

const NOW = new Date("2026-08-11T00:00:00.000Z");
const MIN = 60_000;
const at = (msBefore: number): number => (NOW.getTime() - msBefore) / 1000;
let t: ReturnType<typeof tree>;

beforeAll(() => {
	t = tree();
	write(t.work, "busy/README.md", "# busy\n", at(0));
	// Written five minutes ago: something is driving this run.
	journal(
		join(t.work, "busy"),
		"2026-08-10-fresh",
		{ title: '"Run: mid flight"', date: "2026-08-10T23:55:00.000Z", status: "running" },
		[],
		at(5 * MIN),
	);
	// Same claimed status, nothing written since yesterday morning.
	journal(
		join(t.work, "busy"),
		"2026-08-10-dead",
		{ title: '"Run: abandoned"', date: "2026-08-10T09:00:00.000Z", status: "running" },
		[],
		at(15 * 60 * MIN),
	);
	session({ repoRoot: join(t.work, "busy"), task: "typing now", open: true, atSec: at(5 * MIN) });
	session({
		repoRoot: join(t.work, "busy"),
		task: "killed overnight",
		open: true,
		atSec: at(9 * 60 * MIN),
	});
});

afterAll(() => t.cleanup());

it("the rule itself: running plus a recent write, nothing else", () => {
	const now = NOW.getTime();
	expect(isLive("running", now - STALL_MS + MIN, now)).toBe(true);
	expect(isLive("running", now - STALL_MS - MIN, now)).toBe(false);
	expect(isLive("completed", now, now)).toBe(false);
	expect(ageStatus("running", now - 2 * STALL_MS, now)).toBe("stalled");
	expect(ageStatus("completed", now - 2 * STALL_MS, now)).toBe("completed");
	// A stamp from the future (clock skew) is not evidence of death.
	expect(ageStatus("running", now + STALL_MS, now)).toBe("running");
});

it("the feed dims the abandoned run and leaves the moving one alone", () => {
	const rows = runFeed(t.cfg, { project: "busy" }, NOW.getTime());
	const status = (title: string) => rows.find((r) => r.title === title)?.status;
	expect(status("mid flight")).toBe("running");
	expect(status("typing now")).toBe("running");
	expect(status("abandoned")).toBe("stalled");
	expect(status("killed overnight")).toBe("stalled");
	// "none" is the dim pill: no live pulse, and no claim about how it ended.
	expect(rows.find((r) => r.title === "abandoned")?.verdict).toBe("none");
	expect(rows.find((r) => r.title === "mid flight")?.verdict).toBe("live");
});

it("the project badge counts the same two rows the feed calls live", () => {
	const busy = scanProjects(t.cfg, NOW).find((p) => p.name === "busy");
	expect(busy?.liveRuns).toBe(2); // the fresh journal and the fresh session
	const later = new Date(NOW.getTime() + 2 * 60 * MIN);
	expect(scanProjects(t.cfg, later).find((p) => p.name === "busy")?.liveRuns).toBe(0);
});

it("the Overview tile counts that same population — no surface disagrees", () => {
	const o = buildOverview(scanSessions(), scanJournals(t.cfg.ui.harnessDirs), 0, undefined, NOW);
	expect(o.stats.find((s) => s.label === "running")?.value).toBe("2");
	expect(o.harnesses).toEqual([{ name: "busy", runs: 2, live: 1 }]);
	const later = new Date(NOW.getTime() + 2 * 60 * MIN);
	const dead = buildOverview(
		scanSessions(),
		scanJournals(t.cfg.ui.harnessDirs),
		0,
		undefined,
		later,
	);
	expect(dead.stats.find((s) => s.label === "running")?.value).toBe("0");
});

/** A flow run that checkpointed no step: started, then nothing. Same rule —
 * young means it is between nodes, old means it died between them. */
function checkpoint(runId: string, startedAt: string): void {
	const dir = join(t.home, "flows", "checkpoints", runId);
	mkdirSync(dir, { recursive: true });
	const head = { type: "run", runId, spec: "fix", task: "add a retry", at: startedAt };
	writeFileSync(join(dir, "steps.jsonl"), `${JSON.stringify(head)}\n`);
}

it("a flow run with no steps is running while young, stalled once it is not", async () => {
	checkpoint("flow-fix-fresh", new Date(NOW.getTime() - 5 * MIN).toISOString());
	checkpoint("flow-fix-dead", new Date(NOW.getTime() - 9 * 60 * MIN).toISOString());
	expect((await flowRun("flow-fix-fresh", NOW.getTime()))?.status).toBe("running");
	expect((await flowRun("flow-fix-dead", NOW.getTime()))?.status).toBe("stalled");
});
