/**
 * `ah context` — the window onto what a run is told before its first turn.
 *
 * The thing under test is not the assembler (test/context-build*.test.ts owns
 * that) but the promise this command makes: the block is printed VERBATIM, the
 * `--json` view carries the same block and the same losses rather than a
 * second opinion about them, and asking about a repo that is not there is
 * answered instead of thrown — a stack trace out of a read-only query command
 * is indistinguishable, to a script, from the repo having nothing to say.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { contextCmd } from "../src/cli/context-cmd.js";
import { capture } from "./cli2-helpers.js";

let repo: string;
let home: string;
const saved = process.env.AH_HOME;

beforeEach(async () => {
	repo = await mkdtemp(join(tmpdir(), "ah-cli-ctx-"));
	home = await mkdtemp(join(tmpdir(), "ah-cli-ctx-home-"));
	process.env.AH_HOME = home;
	await writeFile(
		join(repo, "AGENTS.md"),
		"# House rules\n\nTabs, not spaces. Every file opens with a comment saying why it exists.\nRun the gate before reporting done, and never push to main.\n",
	);
	await writeFile(join(repo, "package.json"), '{"name":"x","scripts":{"test":"vitest run"}}');
});

afterEach(() => {
	if (saved === undefined) delete process.env.AH_HOME;
	else process.env.AH_HOME = saved;
});

test("prints the block itself, a row per source and every omission", () => {
	const out = capture();
	expect(contextCmd("respect the token budget", { repo, budget: "3000", out: out.out })).toBe(0);
	const text = out.text();

	// The block, verbatim: preamble, fence and provenance line all present.
	expect(text).toContain("BLOCK  verbatim, exactly what the run is given:");
	expect(text).toContain("# Run context");
	expect(text).toContain("<<<AH-CONTEXT quoted House rules");
	expect(text).toContain("From: House rules [source house-rules | pinned | AGENTS.md]");
	expect(text).toContain("1. npm test");
	// Per-source token counts: every registered source gets a row, including
	// the ones that found nothing (invariant 19 — a missing row and a wired-up
	// source that returned nothing have completely different fixes).
	for (const id of ["workspace", "house-rules", "verify", "history", "runs", "profile"]) {
		expect(text).toMatch(new RegExp(`\\n  ${id}\\s+\\w+\\s+\\d+ of \\d+\\s+\\d+ tok`));
	}
	expect(text).toContain("OMITTED");
	expect(text).toMatch(/\d+ of 3000 tokens/);
});

test("--json is valid JSON carrying the same block, sources and omissions", () => {
	const printed = capture();
	contextCmd("respect the token budget", { repo, budget: "3000", out: printed.out });
	const asJson = capture();
	expect(
		contextCmd("respect the token budget", { repo, budget: "3000", json: true, out: asJson.out }),
	).toBe(0);

	const got = JSON.parse(asJson.text()) as {
		task: string;
		budget: number;
		tokens: number;
		text: string;
		sources: { source: string; kept: number; tokens: number }[];
		included: { id: string }[];
		omitted: { id: string; reason: string; note: string }[];
	};
	expect(got.task).toBe("respect the token budget");
	expect(got.budget).toBe(3000);
	expect(got.tokens).toBeLessThanOrEqual(3000);
	// Same block, byte for byte — a --json view that reformats is a second
	// artefact, and then two things have to be debugged instead of one.
	expect(printed.text()).toContain(got.text);
	expect(got.sources.map((s) => s.source)).toEqual([
		"workspace",
		"house-rules",
		"verify",
		"history",
		"runs",
		"profile",
	]);
	// The counts the printed form shows are the counts the JSON shows.
	expect(got.sources.reduce((n, s) => n + s.kept, 0)).toBe(got.included.length);
	expect(got.sources.reduce((n, s) => n + s.tokens, 0)).toBeLessThanOrEqual(3000);
	for (const o of got.omitted) {
		expect(printed.text()).toContain(o.id);
		expect(o.note.length).toBeGreaterThan(0);
	}
});

test("a nonexistent repo fails cleanly rather than throwing", () => {
	const out = capture();
	const missing = join(repo, "no", "such", "place");
	expect(() =>
		contextCmd("respect the token budget", { repo: missing, out: out.out }),
	).not.toThrow();
	expect(contextCmd("respect the token budget", { repo: missing, out: out.out })).toBe(1);
	expect(out.text()).toContain("ah: --repo is not a readable directory");
	expect(out.text()).not.toContain("# Run context");
});

test("a --budget that is not a positive integer is refused, not rounded", () => {
	for (const budget of ["0", "-5", "1.5", "lots"]) {
		const out = capture();
		expect(contextCmd("respect the token budget", { repo, budget, out: out.out })).toBe(1);
		expect(out.text()).toBe("ah: --budget must be a positive integer\n");
	}
});
