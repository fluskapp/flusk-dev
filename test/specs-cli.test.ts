import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, expect, test } from "vitest";
import { specCmd } from "../src/cli/spec-cmd.js";
import { SPEC_DIR } from "../src/features/specs/spec.types.js";
import { capture } from "./cli2-helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await mkdtemp(join(tmpdir(), "flusk-spec-cli-"));
});

test("spec new scaffolds from a template and refuses to overwrite", () => {
	const out = capture();
	expect(specCmd("new", "retry-hook", { repo, template: "bugfix", out: out.out })).toBe(0);
	expect(out.text()).toContain(`created ${SPEC_DIR}/retry-hook.md (bugfix template)`);
	expect(out.text()).toContain("flusk run <task> --spec retry-hook");
	const again = capture();
	expect(specCmd("new", "retry-hook", { repo, out: again.out })).toBe(1);
	expect(again.text()).toContain(`spec "retry-hook" already exists`);
});

test("spec list prints name, status, mode, title — and every skipped file with its why", async () => {
	const scaffold = capture();
	expect(specCmd("new", "retry-hook", { repo, out: scaffold.out })).toBe(0);
	await mkdir(join(repo, SPEC_DIR), { recursive: true });
	await writeFile(join(repo, SPEC_DIR, "broken.md"), "no fence\n");
	const out = capture();
	expect(specCmd("list", undefined, { repo, out: out.out })).toBe(0);
	expect(out.text()).toMatch(/retry-hook\s+draft\s+build\s+retry hook/);
	expect(out.text()).toContain(`skipped: ${SPEC_DIR}/broken.md — missing frontmatter`);
});

test("spec list --json emits the SpecScan shape; an empty repo says how to start", () => {
	const empty = capture();
	expect(specCmd("list", undefined, { repo, out: empty.out })).toBe(0);
	expect(empty.text()).toContain("flusk spec new <name>");
	const scaffold = capture();
	specCmd("new", "one", { repo, out: scaffold.out });
	const out = capture();
	expect(specCmd("list", undefined, { repo, json: true, out: out.out })).toBe(0);
	const scan = JSON.parse(out.text()) as { specs: Array<{ name: string }>; skipped: unknown[] };
	expect(scan.specs.map((s) => s.name)).toEqual(["one"]);
	expect(scan.skipped).toEqual([]);
});

test("bad template, bad name, missing name and unknown subcommand are refusals", () => {
	const bad = capture();
	expect(specCmd("new", "x", { repo, template: "vibes", out: bad.out })).toBe(2);
	expect(bad.text()).toContain("--template must be feature, bugfix, refactor");
	const traversal = capture();
	expect(specCmd("new", "../escape", { repo, out: traversal.out })).toBe(1);
	expect(traversal.text()).toContain("letters, digits");
	const none = capture();
	expect(specCmd("new", undefined, { repo, out: none.out })).toBe(2);
	expect(none.text()).toContain("spec new needs a name");
	const sub = capture();
	expect(specCmd("wat", undefined, { repo, out: sub.out })).toBe(2);
	expect(sub.text()).toContain("Usage:");
});
