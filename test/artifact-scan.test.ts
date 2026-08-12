import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Artifact, scanArtifacts } from "../src/ui/artifact-scan.js";

let home: string; // stands in for ~/projects
let proj: string;

function write(rel: string, body: string, mtimeSec?: number): void {
	const path = join(proj, rel);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, body);
	if (mtimeSec !== undefined) utimesSync(path, mtimeSec, mtimeSec);
}

const byRel = (list: Artifact[], rel: string): Artifact | undefined =>
	list.find((a) => a.path === join(proj, rel));

beforeAll(() => {
	home = mkdtempSync(join(tmpdir(), "flusk-artifacts-"));
	proj = join(home, "alpha");
	mkdirSync(proj, { recursive: true });
	write("CLAUDE.md", "# Context\n", 1_000);
	write("AGENTS.md", "no heading here\n", 1_010);
	write(
		"README.md",
		"---\ntitle: Alpha Readme\nstatus: live\nstages:\n  build: ok\n---\n# Ignored\n",
		1_020,
	);
	write("NOTES.md", "# Loose note\n", 1_030);
	write("plans/next.md", "# The plan\n", 1_040);
	write("docs/design.md", "# Design\n", 1_050);
	write("docs/runs/2026-08-10.md", "# A run journal\n", 1_060);
	write("skills/deploy/SKILL.md", "# Deploy\n", 1_070);
	write(".claude/skills/review.md", "# Review\n", 1_080);
	write("node_modules/pkg/README.md", "# Vendored\n", 1_090);
	write("docs/a/b/c/deep.md", "# Deep enough\n", 1_100);
	write("docs/a/b/c/d/too-deep.md", "# Too deep\n", 1_110);
	mkdirSync(join(home, "beta"), { recursive: true });
	writeFileSync(join(home, "beta", "README.md"), "# Beta\n");
});

afterAll(() => rmSync(home, { recursive: true, force: true }));

it("classifies every artifact kind by location", () => {
	const list = scanArtifacts([join(home, "*")]);
	expect(byRel(list, "CLAUDE.md")?.kind).toBe("context");
	expect(byRel(list, "AGENTS.md")?.kind).toBe("context");
	expect(byRel(list, "README.md")?.kind).toBe("readme");
	expect(byRel(list, "NOTES.md")?.kind).toBe("note");
	expect(byRel(list, "plans/next.md")?.kind).toBe("plan");
	expect(byRel(list, "docs/design.md")?.kind).toBe("doc");
	expect(byRel(list, "skills/deploy/SKILL.md")?.kind).toBe("skill");
	expect(byRel(list, ".claude/skills/review.md")?.kind).toBe("skill");
	expect(byRel(list, "CLAUDE.md")?.project).toBe("alpha");
	expect(list.some((a) => a.project === "beta")).toBe(true);
});

it("excludes docs/runs, node_modules and anything past the depth cap", () => {
	const list = scanArtifacts([join(home, "*")]);
	expect(byRel(list, "docs/runs/2026-08-10.md")).toBeUndefined();
	expect(byRel(list, "node_modules/pkg/README.md")).toBeUndefined();
	expect(byRel(list, "docs/a/b/c/deep.md")?.kind).toBe("doc");
	expect(byRel(list, "docs/a/b/c/d/too-deep.md")).toBeUndefined();
});

it("takes the title from frontmatter, then a heading, then the filename", () => {
	const list = scanArtifacts([join(home, "*")]);
	const readme = byRel(list, "README.md");
	expect(readme?.title).toBe("Alpha Readme");
	expect(readme?.frontmatter).toEqual({ title: "Alpha Readme", status: "live" }); // nested block ignored
	expect(byRel(list, "CLAUDE.md")?.title).toBe("Context");
	expect(byRel(list, "AGENTS.md")?.title).toBe("AGENTS");
	expect(byRel(list, "CLAUDE.md")?.frontmatter).toEqual({});
	expect(byRel(list, "CLAUDE.md")?.bytes).toBeGreaterThan(0);
});

it("orders newest first and honours the limit", () => {
	const list = scanArtifacts([join(home, "*")]);
	const times = list.map((a) => a.mtimeMs);
	expect([...times].sort((a, b) => b - a)).toEqual(times);
	expect(scanArtifacts([join(home, "*")], 2)).toHaveLength(2);
	expect(scanArtifacts([join(home, "*")], 0)).toHaveLength(0);
});

it("tolerates missing and unreadable paths without throwing", () => {
	expect(scanArtifacts([join(home, "nope", "*")])).toEqual([]);
	expect(scanArtifacts([join(home, "does-not-exist")])).toEqual([]);
	expect(scanArtifacts([])).toEqual([]);
	const locked = join(home, "locked");
	mkdirSync(join(locked, "docs"), { recursive: true });
	chmodSync(join(locked, "docs"), 0o000);
	try {
		expect(() => scanArtifacts([join(home, "*")])).not.toThrow();
	} finally {
		chmodSync(join(locked, "docs"), 0o755);
		rmSync(locked, { recursive: true, force: true });
	}
});
