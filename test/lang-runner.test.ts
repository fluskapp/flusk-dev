/**
 * The run loop end to end, offline: LangChain's own FakeListChatModel, a seeded
 * history index, a temp AH_HOME and a temp repo. No key, no socket, no real
 * gate command beyond `true`/`exit 3` — and not one hand-written prompt: every
 * prompt asserted below is the one the composer built.
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { FIX, SHIP } from "../src/lang/library.js";
import { runFlow } from "../src/lang/runner.js";
import { loadScores } from "../src/provider/scores.js";
import { setupTestHome, teardownTestHome } from "./helpers.js";
import { CFG as cfg, flowOpts, scripted, TASK } from "./lang-flow-helpers.js";
import { withLangRuntime } from "./lang-guard.js";

const withLang = await withLangRuntime();

let repo: string;

beforeEach(async () => {
	repo = await setupTestHome("ah-lang-runner-");
});

afterEach(() => {
	teardownTestHome();
});

const opts = (over: Parameters<typeof flowOpts>[1]) => flowOpts(repo, over);

withLang("runFlow", () => {
	it("runs every step in order, on prompts nobody wrote", async () => {
		const { chat, prompts } = await scripted(["the plan", "the change", "the report"]);
		const r = await runFlow(FIX, TASK, cfg, opts({ chat, repoConfig: { verify: ["true"] } }));
		expect(r.outcome).toBe("completed");
		expect(r.state.steps.map((s) => s.nodeId)).toEqual(["plan", "code", "verify"]);
		expect(r.state.steps.every((s) => s.ok && s.promptTokens > 0)).toBe(true);
		expect(r.state.costUsd).toBeCloseTo(0.75);
		const code = prompts[1] ?? "";
		expect(code.split("\n")[0]).toBe(
			"Make the code change for make the change using the evidence below.",
		);
		expect(code).toContain("the plan"); // inherited: nobody wired plan → code
		expect(code).toContain("retry the upload with backoff"); // retrieved precedent
		// The run fed itself forward: the models that ran were scored.
		expect(Object.keys((await loadScores()).code ?? {})).toHaveLength(1);
		expect(await readdir(join(repo, "docs", "runs"))).toHaveLength(1);
	});

	it("sends a failed gate back to the code step, once, then blocks", async () => {
		const said = ["the plan", "first try", "a report", "second try", "another report"];
		const { chat, prompts } = await scripted(said);
		const r = await runFlow(FIX, TASK, cfg, opts({ chat, repoConfig: { verify: ["exit 3"] } }));
		expect(r.state.steps.map((s) => s.nodeId)).toEqual([
			"plan",
			"code",
			"verify",
			"code",
			"verify",
		]);
		expect(r.outcome).toBe("blocked");
		expect(r.ok).toBe(false);
		// The retry carries the gate's own evidence, as the agent loop's does.
		expect(prompts[3]).toContain("exited 3");
	});

	it("composes flows: ship runs fix as one of its own steps", async () => {
		const said = ["a plan", "the inner change", "inner report", "reviewed", "outer report"];
		const { chat } = await scripted(said);
		const r = await runFlow(SHIP, TASK, cfg, opts({ chat, repoConfig: { verify: ["true"] } }));
		const ran = r.state.steps.map((s) => `${s.nodeId}:${s.kind}`);
		// The nested flow's ids live UNDER the node that ran it, the shape the
		// dry plan already shows — so `verify` and `fix/verify` stay distinct
		// artifacts, checkpoint slots and journal stages.
		expect(ran).toEqual([
			"fix/plan:plan",
			"fix/code:code",
			"fix/verify:verify",
			"fix:flow",
			"review:review",
			"verify:verify",
		]);
		expect(r.state.artifacts["fix/verify"]).toContain("inner report");
		expect(r.state.artifacts.verify).toContain("outer report");
		expect(r.outcome).toBe("completed");
	});

	it("blocks a report the harness cannot back up", async () => {
		const { chat } = await scripted(["the plan", "the change", "All tests pass now."]);
		const r = await runFlow(FIX, TASK, cfg, opts({ chat, retries: 0 }));
		expect(r.outcome).toBe("blocked");
		expect(r.state.steps.at(-1)?.note).toMatch(/report claims verification passed/);
	});

	it("lets the plan grow the graph at run time, and says when the cap trimmed it", async () => {
		const plan = "- review: check the edges\n- summarize: say what happened";
		const { chat } = await scripted([plan, "reviewed", "the change", "a report"]);
		const grow = opts({ chat, maxNodes: 4, repoConfig: { verify: ["true"] } });
		const r = await runFlow(FIX, TASK, cfg, grow);
		expect(r.state.steps.map((s) => s.nodeId)).toEqual(["plan", "review", "code", "verify"]);
		expect(r.state.steps[0]?.note).toBe("the plan added 1 step(s); the 4-node cap trimmed 1");
		expect(r.outcome).toBe("completed");
	});

	it("turns a dead model into a failed result rather than a throw", async () => {
		const { chat } = await scripted(["never reached"], 0);
		const r = await runFlow(FIX, TASK, cfg, opts({ chat }));
		expect(r.outcome).toBe("failed");
		expect(r.ok).toBe(false);
		expect(r.state.steps.at(-1)?.note).toContain("the model fell over");
		expect(await readdir(join(repo, "docs", "runs"))).toHaveLength(1);
	});
});
