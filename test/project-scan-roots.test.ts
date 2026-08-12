/**
 * How the project model decides WHAT a project is: which configured roots
 * survive, how journals and documents are joined to them, and that a scan
 * notices a file that changed. Split from project-scan.test.ts, which is
 * about what a project then reports.
 */
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import type { ProjectSummary } from "../src/features/projects/projects.types.js";
import { scanProjects } from "../src/features/projects/project-scan.repository.js";
import { journal, session, tree, write } from "./project-fixture.js";

const NOW = new Date("2026-08-11T00:00:00.000Z");
let t: ReturnType<typeof tree>;
const find = (list: ProjectSummary[], name: string): ProjectSummary | undefined =>
	list.find((p) => p.name === name);

beforeAll(() => {
	t = tree();
	const { work } = t;
	write(work, "linof/bin/linof.js", "\n");
	write(work, "linof/src/pipeline.js", "\n");
	write(work, "linof/config.json", "{}");
	write(work, "linof/README.md", "# linof\n", 1_000);
	journal(join(work, "linof"), "2026-08-10-done", {
		title: '"Run: ship it"',
		date: "2026-08-10T12:00:00.000Z",
		status: "done",
	});
	write(work, "plain/README.md", "# plain\n", 2_000);
	write(work, "plain/docs/design.md", "# design\n", 2_000);
	write(work, "gadget/bin/g.js", "\n");
	write(work, "gadget/src/g.js", "\n");
	write(work, "gadget/config.json", "{}");
	session({ repoRoot: join(work, "linof"), task: "patch the harness", atSec: 1_770_000_000 });
});

afterAll(() => t.cleanup());

it("drops a container root instead of publishing it as a phantom project", () => {
	// The shipped defaults expand to BOTH ~/projects/* and
	// ~/projects/playground/*, which makes ~/projects/playground a container:
	// keeping it adds a bogus row and indexes its children's markdown twice.
	const cfg = { ...t.cfg, ui: { harnessDirs: [], projectDirs: [t.work, join(t.work, "*")] } };
	const list = scanProjects(cfg, NOW);
	expect(list.map((p) => p.name).sort()).toEqual(["gadget", "linof", "plain"]);
	expect(list.reduce((n, p) => n + p.docs, 0)).toBe(3); // no document counted twice
});

it("joins on the root path, so two projects sharing a name stay apart", () => {
	// ~/projects/foo and ~/projects/playground/foo are different projects; a
	// basename join poured each one's journals and docs into the other.
	const nested = join(t.work, "nest");
	write(nested, "linof/README.md", "# a different linof\n", 1_000);
	journal(join(nested, "linof"), "2026-08-10-elsewhere", {
		title: '"Run: elsewhere"',
		date: "2026-08-10T11:00:00.000Z",
		status: "done",
	});
	const cfg = {
		...t.cfg,
		ui: {
			harnessDirs: [join(t.work, "*", "docs", "runs"), join(nested, "*", "docs", "runs")],
			projectDirs: [join(t.work, "*"), join(nested, "*")],
		},
	};
	const both = scanProjects(cfg, NOW).filter((p) => p.name === "linof");
	expect(both).toHaveLength(2);
	const runs = new Map(both.map((p) => [p.path, p.runs]));
	expect(runs.get(join(t.work, "linof"))).toBe(2); // 1 journal + 1 session
	expect(runs.get(join(nested, "linof"))).toBe(1);
	for (const p of both) expect(p.docs).toBe(1);
});

it("re-reads a journal that changed since the last scan", () => {
	// Scanners memoize per file identity; a cache that missed an edit would
	// leave the dashboard reporting a failure as a success.
	expect(find(scanProjects(t.cfg, NOW), "linof")?.attention.map((a) => a.label)).not.toContain(
		"run failed: ship it",
	);
	journal(
		join(t.work, "linof"),
		"2026-08-10-done",
		{ title: '"Run: ship it"', date: "2026-08-10T12:00:00.000Z", status: "failed" },
		[["gate", "done|0.1s|pass"]],
		1_786_374_000, // 2026-08-10T15:00:00Z
	);
	expect(find(scanProjects(t.cfg, NOW), "linof")?.attention.map((a) => a.label)).toContain(
		"run failed: ship it",
	);
});
