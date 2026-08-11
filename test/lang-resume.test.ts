/**
 * A run that stopped, continued — offline, as lang-runner.test.ts is.
 *
 * A resume is the SAME run: it replays what already passed instead of paying
 * for it twice, it inherits the spend the first attempt made rather than
 * starting its cap over at zero, and it overwrites that run's journal instead
 * of leaving the project with two records of one run.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { checkpointPath, readCheckpoint } from "../src/lang/checkpoint-read.js";
import { loadFlowStats } from "../src/lang/flow-stats.js";
import { FIX } from "../src/lang/library.js";
import { runFlow } from "../src/lang/runner.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";
import { CFG as cfg, flowOpts, scripted, TASK } from "./lang-flow-helpers.js";
import { withLangRuntime } from "./lang-guard.js";

const withLang = await withLangRuntime();

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-lang-resume-");
});

afterEach(() => {
	teardownTestHome();
});

const opts = (over: Parameters<typeof flowOpts>[1]) => flowOpts(repo, over);

withLang("a resumed run", () => {
	it("checkpoints each step and resumes from the last completed one", async () => {
		const first = await scripted(["the plan", "the change"], 2);
		const crashed = await runFlow(FIX, TASK, cfg, opts({ chat: first.chat, runId: "run-1" }));
		expect(crashed.outcome).toBe("failed");
		const lines = await readCheckpoint("run-1");
		expect(lines.map((l) => l.type)).toEqual(["run", "step", "step"]);
		expect(await readFile(checkpointPath("run-1"), "utf8")).toContain('"nodeId":"code"');

		const second = await scripted(["the report"]);
		const resumed = opts({
			chat: second.chat,
			runId: "run-1",
			resume: true,
			repoConfig: { verify: ["true"] },
		});
		const r = await runFlow(FIX, TASK, cfg, resumed);
		expect(second.prompts).toHaveLength(1); // only the unfinished step ran
		const notes = r.state.steps.map((s) => s.note ?? "ran now");
		expect(notes).toEqual(["replayed from checkpoint", "replayed from checkpoint", "ran now"]);
		expect(r.outcome).toBe("completed");
	});

	it("carries the first attempt's spend into the cap, not a fresh zero", async () => {
		const first = await scripted(["the plan", "the change", "a report"]);
		const capped = { ...cfg, budgets: { ...cfg.budgets, maxCostUsd: 0.4 } };
		const at = { runId: "run-2", costOf: () => 0.25, repoConfig: { verify: ["true"] } };
		const stopped = await runFlow(FIX, TASK, capped, opts({ chat: first.chat, ...at }));
		expect(first.prompts).toHaveLength(2);
		expect(stopped.state.costUsd).toBeCloseTo(0.5);

		// 0.5 already spent against a 0.4 cap. A resume that started its tally
		// over at zero would cheerfully pay for another call; this one must not.
		const second = await scripted(["a report"]);
		const r = await runFlow(FIX, TASK, capped, opts({ chat: second.chat, ...at, resume: true }));
		expect(second.prompts).toEqual([]);
		expect(r.state.steps.at(-1)?.note).toBe("stopped: budget cap reached");
	});

	it("overwrites the run's journal and tally instead of recording it twice", async () => {
		const first = await scripted(["the plan", "the change"], 2);
		await runFlow(
			FIX,
			TASK,
			cfg,
			opts({ chat: first.chat, runId: "flow-fix-2026-08-11-09-00-00" }),
		);
		const before = (await loadFlowStats()).fix?.attempts ?? 0;

		const second = await scripted(["a report"]);
		const again = opts({
			chat: second.chat,
			runId: "flow-fix-2026-08-11-09-00-00",
			resume: true,
			repoConfig: { verify: ["true"] },
		});
		expect((await runFlow(FIX, TASK, cfg, again)).outcome).toBe("completed");
		// One logical run: one journal file, and one attempt in the tally.
		expect(await readdir(join(repo, "docs", "runs"))).toHaveLength(1);
		expect((await loadFlowStats()).fix?.attempts ?? 0).toBe(before);
	});

	it("stops at the cost cap, as the agent loop does", async () => {
		const { chat, prompts } = await scripted(["the plan", "the change", "a report"]);
		const capped = { ...cfg, budgets: { ...cfg.budgets, maxCostUsd: 0.3 } };
		const r = await runFlow(FIX, TASK, capped, opts({ chat, repoConfig: { verify: ["true"] } }));
		expect(prompts).toHaveLength(2);
		expect(r.outcome).toBe("blocked");
		expect(r.state.steps.at(-1)?.note).toBe("stopped: budget cap reached");
	});
});
