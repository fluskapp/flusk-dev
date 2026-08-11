/**
 * The two things a verify node must refuse to believe.
 *
 * A flow node is a chat completion with no tools, so its report is the only
 * thing the model authored and the only thing that can lie. `gate()` checks it
 * against observations the model cannot forge: which commands actually ran, and
 * what actually changed on disk. No LangGraph here — the gate is ah's own code.
 */
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import { filesTouched, gate, NO_GATE } from "../src/lang/gate.js";
import type { NodeOutcome } from "../src/lang/types.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

const cfg = { ...DEFAULT_CONFIG, verify: { retries: 0, evidenceLines: 5 } };
const base: NodeOutcome = { ok: true, output: "", promptTokens: 10 };

beforeEach(async () => {
	repo = await setupTestHome("ah-lang-gate-");
});

afterEach(() => {
	teardownTestHome();
});

it("treats the absence of a gate command as UNVERIFIED, not as a pass", () => {
	// An empty repo detects nothing to run. Scoring that `ok` is exactly the
	// "grades its own homework" case the runtime is supposed to rule out.
	const out = gate("Looks fine to me.", base, cfg, { repoRoot: repo });
	expect(out.ok).toBe(false);
	expect(out.note).toBe(NO_GATE);
	expect(out.output).toContain(NO_GATE);
});

it("passes only when a real command really passed", () => {
	const at = { repoRoot: repo, repoConfig: { verify: ["true"] } };
	expect(gate("Ran the checks.", base, cfg, at).ok).toBe(true);
	const red = { repoRoot: repo, repoConfig: { verify: ["exit 3"] } };
	const out = gate("Ran the checks.", base, cfg, red);
	expect(out.ok).toBe(false);
	expect(out.note).toContain("exited 3");
});

it("blocks a report that claims verification the harness never saw", () => {
	// Nothing to run, and the report says everything is green: that is the claim
	// the harness can contradict outright, and it outranks the "no gate" note.
	const out = gate("All tests pass now.", base, cfg, { repoRoot: repo });
	expect(out.ok).toBe(false);
	expect(out.note).toMatch(/report claims verification passed/);
});

it("blocks a report describing edits when nothing on disk changed", () => {
	// In a flow there is no other actor: a text-only node cannot have written a
	// file, so a claim of edits with an unchanged tree is a false report, not a
	// warning to be filed away next to a passing gate.
	const at = { repoRoot: repo, repoConfig: { verify: ["true"] } };
	const out = gate("I updated the uploader to retry.", base, cfg, at);
	expect(out.ok).toBe(false);
	expect(out.note).toMatch(/no file was written/);
});

it("reads filesTouched off git rather than believing the report", async () => {
	const git = (...args: string[]): string =>
		execFileSync("git", args, { cwd: repo, encoding: "utf8" });
	expect(filesTouched(repo)).toEqual([]); // not a repo at all
	git("init", "-q");
	git("config", "user.email", "t@example.com");
	git("config", "user.name", "t");
	await writeFile(join(repo, "worker.ts"), "export const x = 1;\n");
	expect(filesTouched(repo)).toEqual(["worker.ts"]);

	// With a real edit on disk, the same report is no longer a false claim.
	const at = { repoRoot: repo, repoConfig: { verify: ["true"] } };
	expect(gate("I updated the uploader to retry.", base, cfg, at).ok).toBe(true);
});
