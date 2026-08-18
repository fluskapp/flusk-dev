/**
 * The run Summary end to end: a real (fake-provider) run leaves session
 * entries behind, and assembleRunSummary/summarizeSession derive every field
 * from them — the conclusion sentence carries only harness-observed clauses,
 * each traceable to a field, never the model's own closing prose.
 */
import { mkdirSync, readdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { runCmd } from "../src/cli/run-cmd.js";
import { assembleRunSummary, summarizeSession } from "../src/features/run/summary.js";
import { assistantText, assistantToolCalls } from "../src/features/provider/fake.js";
import type { Msg } from "../src/features/run/run.types.js";
import type { SessionEntry } from "../src/features/session/entries.js";
import { capture, SLOW } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("flusk-summary-");
	mkdirSync(join(repo, ".git"), { recursive: true }); // not a real repo: isolation off
});
afterEach(() => teardownTestHome());

/** Every clause shape the assembler can emit; anything else is invented. */
const HARNESS_CLAUSES = [
	/^(Completed|Error|Aborted|Budget|MaxTurns|Deadline) (in \d+ turns? ?)?(for \$[0-9.]+)?$/i,
	/^touched \d+ files?$/,
	/^gate passed \d+ commands?$/,
	/^report check \S+$/,
];

it(
	"a fake run summarizes to harness-observed fields and clauses only",
	async () => {
		const script = [
			{ message: assistantToolCalls([{ id: "c1", name: "bash", args: { command: "echo hi" } }]) },
			{ message: assistantToolCalls([{ id: "c2", name: "write", args: { file_path: "note.txt", content: "hi\n" } }]) },
			{ message: assistantText("I definitely refactored everything.") }, // model prose: must not appear
		];
		const fake = join(repo, "script.json");
		await writeFile(fake, JSON.stringify(script));
		const { out } = capture();
		const outcome = await runCmd({ task: "summarize me", repo, out, quiet: true, noIsolation: true, fake });
		expect(outcome).toBe("completed");
		const { fluskHome } = await import("../src/platform/paths/paths.js");
		const root = join(fluskHome(), "sessions");
		const slug = readdirSync(root)[0] as string;
		const file = readdirSync(join(root, slug))[0] as string;
		const s = await summarizeSession(join(root, slug, file));
		expect(s.outcome).toBe("completed");
		expect(s.model).toBe("fake/fake-1");
		expect(s.turns).toBeGreaterThanOrEqual(1);
		expect(s.commandsRun).toEqual([{ cmd: "echo hi", exit: 0 }]);
		expect(s.filesTouched).toHaveLength(1);
		expect(s.filesTouched[0]).toMatch(/note\.txt$/);
		// The sentence: every clause matches a harness-observed shape, and the
		// model's own account of the run is nowhere in it.
		expect(s.conclusion).not.toContain("refactored");
		for (const clause of s.conclusion.replace(/\.$/, "").split("; ")) {
			expect(HARNESS_CLAUSES.some((re) => re.test(clause)), clause).toBe(true);
		}
	},
	SLOW,
);

const msg = (id: number, m: Msg): SessionEntry => ({ type: "message", id, msg: m });

function fixture(): SessionEntry[] {
	return [
		{
			type: "header", version: 1, id: "r1", task: "t", repoRoot: "/repo", gitBranch: null,
			model: { provider: "fake", id: "fake-1", contextWindow: 1000 }, createdAt: "2026-01-01T00:00:00Z",
		},
		msg(1, assistantToolCalls([
			{ id: "c1", name: "bash", args: { command: "npm test" } },
			{ id: "c2", name: "write", args: { file_path: "a.ts", content: "x" } },
			{ id: "c3", name: "edit", args: { file_path: "a.ts", old_string: "x", new_string: "y" } },
			{ id: "c4", name: "bash", args: { command: "false" } },
		])),
		msg(2, { role: "toolResult", callId: "c1", name: "bash", output: "ok", isError: false }),
		msg(3, { role: "toolResult", callId: "c2", name: "write", output: "wrote", isError: false }),
		msg(4, { role: "toolResult", callId: "c3", name: "edit", output: "edited", isError: false }),
		msg(5, { role: "toolResult", callId: "c4", name: "bash", output: "boom\n[exit code 2]", isError: true }),
		{
			type: "stats", id: 6, reason: "completed",
			stats: { turns: 4, usage: { input: 1, output: 1, cacheRead: 0, costUsd: 0.02 }, startedAt: "2026-01-01T00:00:00Z" },
		},
	];
}

it("assembleRunSummary counts tools by run-record's rules and cites the gate", () => {
	const s = assembleRunSummary(fixture(), {
		verifiedBy: ["npm test", "tsc --noEmit"], reasons: [], outcome: "success", reportCheck: "ALLOW",
	});
	expect(s.filesTouched).toEqual(["/repo/a.ts"]); // write+edit of one file dedupes
	expect(s.commandsRun).toEqual([
		{ cmd: "npm test", exit: 0 },
		{ cmd: "false", exit: 2 }, // parsed from the "[exit code N]" output tail
	]);
	expect(s.verified).toEqual(["npm test", "tsc --noEmit"]);
	expect(s.reportCheck).toBe("ALLOW");
	expect(s.verdict).toBe("ok");
	expect(s.gateSource).toBe("facts");
	expect(s.retries).toBeNull();
	expect(s.compactions).toBe(0);
	expect(s.conclusion).toBe(
		"Completed in 4 turns for $0.02; touched 1 file; gate passed 2 commands; report check ALLOW.",
	);
});

it("absent facts drop their clauses instead of inventing them", () => {
	const header = fixture()[0] as SessionEntry;
	const s = assembleRunSummary([header], null);
	expect(s.outcome).toBeNull();
	expect(s.turns).toBeNull();
	expect(s.verified).toEqual([]);
	expect(s.reportCheck).toBeNull();
	expect(s.gateSource).toBe("memory-off");
	expect(s.verdict).toBe("live"); // header-only: no stats yet, so the run reads as running
	expect(s.reasons).toEqual([]);
	expect(s.conclusion).toBe("No harness observations recorded yet.");
});
