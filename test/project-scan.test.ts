import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { ProjectSummary } from "../src/ui/api-types.js";
import { classifyProject, projectRoots, scanProjects } from "../src/ui/project-scan.js";
import { journal, session, tree, write } from "./project-fixture.js";

const NOW = new Date("2026-08-11T00:00:00.000Z");
const SESSION_AT = 1_786_384_800; // 2026-08-10T18:00:00Z
const OPEN_AT = 1_786_388_400; // 2026-08-10T19:00:00Z
let t: ReturnType<typeof tree>;
const find = (list: ProjectSummary[], name: string): ProjectSummary | undefined =>
	list.find((p) => p.name === name);

beforeAll(() => {
	t = tree();
	const { work } = t;
	const linof = join(work, "linof");

	// A harness by every signal: bin/ + src/ + config.json, and journals.
	write(work, "linof/bin/linof.js", "#!/usr/bin/env node\n");
	write(work, "linof/src/pipeline.js", "export const stages = [];\n");
	write(work, "linof/config.json", JSON.stringify({ tools: ["claude", "kimi"] }));
	write(work, "linof/README.md", "# linof\n", 1_000);
	journal(
		linof,
		"2026-08-10-done",
		{
			title: '"Run: ship it"',
			date: "2026-08-10T12:00:00.000Z",
			status: "done",
			// A harness that records what its run cost; most do not.
			cost: "0.75",
		},
		[["gate", "done|0.1s|pass"]],
	);
	journal(linof, "2026-08-10-live", {
		title: '"Run: still going"',
		date: "2026-08-10T09:00:00.000Z",
		status: "running",
	});
	// Inside the attention window: a failure nobody has touched in two days is
	// history, and the rules drop it so the list can reach zero.
	journal(linof, "2026-08-10-bad", {
		title: '"Run: broke"',
		date: "2026-08-10T06:00:00.000Z",
		status: "failed",
	});

	// A harness by shape alone — no journals directory at all.
	write(work, "gadget/bin/g.js", "\n");
	write(work, "gadget/src/g.js", "\n");
	write(work, "gadget/config.json", "{}");

	// A plain repo: markdown and flusk sessions, nothing that drives runs.
	write(work, "plain/README.md", "# plain\n", 2_000);
	write(work, "plain/docs/design.md", "# design\n", 2_000);
	session({ repoRoot: join(work, "plain"), task: "tidy up", costUsd: 0.25, atSec: SESSION_AT });
	session({ repoRoot: join(work, "plain"), task: "still working", open: true, atSec: OPEN_AT });
	session({ repoRoot: linof, task: "patch the harness", costUsd: 1.5, atSec: 1_770_000_000 });
});

afterAll(() => t.cleanup());

it("classifies a harness by shape or journals, everything else as a repo", () => {
	expect(classifyProject(join(t.work, "linof"))).toBe("harness");
	expect(classifyProject(join(t.work, "gadget"))).toBe("harness");
	expect(classifyProject(join(t.work, "plain"))).toBe("repo");
	expect(projectRoots(t.cfg).sort()).toEqual(
		["gadget", "linof", "plain"].map((n) => join(t.work, n)),
	);
});

it("aggregates journals, sessions, docs and spend onto the project", () => {
	const list = scanProjects(t.cfg, NOW);
	const linof = find(list, "linof");
	expect(linof?.kind).toBe("harness");
	expect(linof?.runs).toBe(4); // 3 journals + 1 session
	expect(linof?.sessions).toBe(1);
	expect(linof?.liveRuns).toBe(1);
	expect(linof?.docs).toBe(1);
	// 1.50 from the flusk session plus the 0.75 the journal declares: a harness
	// project used to read $0 however much it had spent.
	expect(linof?.costUsd).toBeCloseTo(2.25);

	const plain = find(list, "plain");
	expect(plain?.kind).toBe("repo");
	expect(plain?.runs).toBe(2);
	expect(plain?.docs).toBe(2);
	expect(plain?.liveRuns).toBe(1); // the session with no stats entry
	expect(plain?.costUsd).toBeCloseTo(0.25);

	const gadget = find(list, "gadget");
	expect(gadget?.runs).toBe(0);
	expect(gadget?.lastActivity).toBeUndefined();
});

it("dates a project by its newest journal, session or document", () => {
	const list = scanProjects(t.cfg, NOW);
	expect(find(list, "linof")?.lastActivity).toBe("2026-08-10T12:00:00.000Z");
	expect(find(list, "plain")?.lastActivity).toBe("2026-08-10T19:00:00.000Z");
});

it("sorts by last activity, newest first, and surfaces attention", () => {
	const list = scanProjects(t.cfg, NOW);
	expect(list.map((p) => p.name)).toEqual(["plain", "linof", "gadget"]);
	const labels = find(list, "linof")?.attention.map((a) => a.label) ?? [];
	expect(labels.some((l) => l.startsWith("run failed: broke"))).toBe(true);
	expect(labels.some((l) => l.startsWith("run stalled >60m: still going"))).toBe(true);
	expect(find(list, "gadget")?.attention).toEqual([]);
	// The open session (no stats entry) last moved at 19:00 and the clock says
	// midnight: "running" forever used to raise nothing at all.
	expect(find(list, "plain")?.attention.map((a) => a.label)).toEqual([
		"session stalled >60m: still working",
	]);
});

it("survives a config that points nowhere", () => {
	const cfg = { ...t.cfg, ui: { harnessDirs: [], projectDirs: [join(t.work, "nope", "*")] } };
	expect(scanProjects(cfg, NOW)).toEqual([]);
});
