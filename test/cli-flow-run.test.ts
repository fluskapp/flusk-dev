/**
 * `flusk flow run` for real, offline: LangChain's own FakeListChatModel behind the
 * runtime's `chat` seam, a temp FLUSK_HOME, a temp repo whose gate is `true` (or
 * `exit 3`), and no key or socket anywhere.
 *
 * What it pins is this slice's contract with the shell: exit 0 ONLY when the
 * run completed and was not blocked — a failed gate is a run that happened and
 * still must exit 1 — and the isolation `flusk run` already insists on, since a
 * verify node shells the repo's own gate commands out in the user's checkout.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { type FlowCmdOpts, flowCmd } from "../src/cli/flow-cmd.js";
import { saveIndex } from "../src/features/history/index-store.repository.js";
import { fakeChatModel } from "../src/features/flows/model.js";
import { capture } from "./cli2-helpers.js";
import { setupTestHome, teardownTestHome, writeHomeConfig } from "./helpers.js";
import { withLangRuntime } from "./lang-guard.js";

const withLang = await withLangRuntime();
const TASK = "add a retry with backoff to the uploader";

let repo: string;

/** Every node gets the next scripted answer, and every prompt is recorded. */
async function scripted(responses: string[]): Promise<{
	chat: FlowCmdOpts["chat"];
	prompts: string[];
}> {
	const prompts: string[] = [];
	const fake = await fakeChatModel(responses);
	const chat: FlowCmdOpts["chat"] = async () => ({
		reason: "",
		model: {
			invoke: async (text: string) => {
				prompts.push(text);
				return fake?.invoke(text) ?? { content: "" };
			},
		},
	});
	return { chat, prompts };
}

async function gate(commands: string[]): Promise<void> {
	await mkdir(join(repo, ".flusk"), { recursive: true });
	await writeFile(join(repo, ".flusk", "config.json"), JSON.stringify({ verify: commands }));
}

beforeEach(async () => {
	repo = await setupTestHome("flusk-flow-run-");
	await writeHomeConfig({ memory: { enabled: false }, verify: { retries: 0, evidenceLines: 5 } });
	saveIndex({ cards: [], builtAt: new Date().toISOString(), stamps: {} });
});

afterEach(() => {
	teardownTestHome();
});

withLang("flusk flow run", () => {
	it("runs the flow the task chose and exits 0", async () => {
		await gate(["true"]);
		const { out, text } = capture();
		const { chat } = await scripted(["the plan", "the change", "the report"]);
		const code = await flowCmd({
			sub: "run",
			arg: TASK,
			repo,
			out,
			chat,
			quiet: true,
			noIsolation: true,
		});
		expect(code).toBe("completed");
		expect(text()).toContain("flow fix: plan -> code -> verify");
		expect(text()).toMatch(/ok\s+plan \(plan\)/);
		expect(text()).toContain("completed · 3 step(s)");
	});

	// A full flow run — ~9s alone, and worker contention under the full suite
	// can push it past the global 20s. The budget matches the work.
	it("meters what it spent instead of reporting every run as free", { timeout: 60_000 }, async () => {
		await gate(["true"]);
		const { out, text } = capture();
		const { chat } = await scripted(["the plan", "the change", "the report"]);
		await flowCmd({ sub: "run", arg: TASK, repo, out, chat, quiet: true, noIsolation: true });
		// `--max-cost` is only a cap if something prices the calls; $0.0000 was
		// what the CLI reported for every run before anything did.
		const cost = /\$(\d+\.\d+)/.exec(text())?.[1] ?? "0";
		expect(Number(cost)).toBeGreaterThan(0);
	});

	// A full flow run whose gate fails — ~7s alone, and worker contention under
	// the full suite can push it past the global 20s. The budget matches the work.
	it("exits non-zero when the gate blocks the run", { timeout: 60_000 }, async () => {
		await gate(["exit 3"]);
		const { out, text } = capture();
		const { chat } = await scripted(["the plan", "the change", "the report"]);
		const code = await flowCmd({
			sub: "run",
			arg: TASK,
			repo,
			out,
			chat,
			quiet: true,
			noIsolation: true,
		});
		expect(code).toBe("blocked");
		expect(text()).toContain("fail verify (verify)");
		expect(text()).toContain("blocked ·");
	});

	// Two full flow runs back to back — ~12s alone, and worker contention under
	// the full suite pushed it past the global 20s. The budget matches the work.
	it("resumes a checkpointed run by id, replaying what already passed", { timeout: 60_000 }, async () => {
		await gate(["true"]);
		const first = capture();
		const { chat } = await scripted(["the plan", "the change", "the report"]);
		await flowCmd({
			sub: "run",
			arg: TASK,
			repo,
			out: first.out,
			chat,
			quiet: true,
			flow: "fix",
			noIsolation: true,
		});
		const runId = /run (flow-fix-[\w-]+)/.exec(first.text())?.[1] ?? "";
		// The precondition, asserted rather than assumed: without it the outcome
		// check below passes whether or not a run id was ever extracted.
		expect(runId).not.toBe("");

		const again = capture();
		const second = await scripted(["replayed"]);
		const code = await flowCmd({
			sub: "resume",
			arg: runId,
			repo,
			out: again.out,
			chat: second.chat,
			quiet: true,
			noIsolation: true,
		});
		expect(code).toBe("completed");
		// Everything already passed, so the resume paid for nothing a second time.
		expect(second.prompts).toEqual([]);
	});
});
