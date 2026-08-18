/**
 * `flusk flow run` isolates itself, exactly as `flusk run` does.
 *
 * A verify node shell-executes the repo's own gate commands — `npm test`,
 * `cargo test`, `make test` — in the user's checkout, up to `verify.retries` + 1
 * times. So the run gets its own branch off a clean tree, and a repo where that
 * is impossible is refused rather than written into.
 */
import { execFileSync } from "node:child_process";
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

const git = (...args: string[]): string =>
	execFileSync("git", args, { cwd: repo, encoding: "utf8" });

/** A real repository with one commit, so isolation has somewhere to branch from. */
async function initRepo(): Promise<void> {
	git("init", "-q");
	git("config", "user.email", "t@example.com");
	git("config", "user.name", "t");
	await writeFile(join(repo, "README.md"), "x\n");
	git("add", "-A");
	git("-c", "core.hooksPath=/dev/null", "commit", "-qm", "init");
}

beforeEach(async () => {
	repo = await setupTestHome("flusk-flow-run-");
	await writeHomeConfig({ memory: { enabled: false }, verify: { retries: 0, evidenceLines: 5 } });
	saveIndex({ cards: [], builtAt: new Date().toISOString(), stamps: {} });
});

afterEach(() => {
	teardownTestHome();
});

withLang("flusk flow run isolates itself, as flusk run does", () => {
	it("refuses a non-git repo, and says how to override", async () => {
		await gate(["true"]);
		const { out, text } = capture();
		const { chat } = await scripted(["never reached"]);
		const code = await flowCmd({ sub: "run", arg: TASK, repo, out, chat });
		expect(code).toBe("error");
		expect(text()).toContain("is not a git repository");
		expect(text()).toContain("--no-isolation");
	});

	it("runs on its own branch, and says which one and what the gate will be", async () => {
		await initRepo();
		await gate(["true"]);
		git("add", "-A");
		git("-c", "core.hooksPath=/dev/null", "commit", "-qm", "gate");
		const { out, text } = capture();
		const { chat } = await scripted(["the plan", "the change", "the report"]);
		const code = await flowCmd({ sub: "run", arg: TASK, repo, out, chat });
		expect(code).toBe("completed");
		expect(text()).toMatch(/isolation: branch flusk\//);
		expect(text()).toContain("verify: true");
		expect(git("rev-parse", "--abbrev-ref", "HEAD").trim()).toMatch(/^flusk\//);
	}, 60_000); // ~8s alone, but exceeds the 20s default under full-suite load

	it("refuses a dirty tree rather than mixing the run into it", async () => {
		await initRepo();
		await gate(["true"]); // written but never committed
		const { out, text } = capture();
		const { chat } = await scripted(["never reached"]);
		const code = await flowCmd({ sub: "run", arg: TASK, repo, out, chat });
		expect(code).toBe("error");
		expect(text()).toContain("working tree is dirty");
	});
});
