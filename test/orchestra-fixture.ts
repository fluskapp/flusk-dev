import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CreateAgentOpts } from "../src/agent/agent.js";
import { DEFAULT_CONFIG } from "../src/config/defaults.js";
import type { AhConfig, ChatBackendConfig } from "../src/config/types.js";
import type { LoopCtx } from "../src/orchestra/delegate.js";
import type { AgentRegistry, AgentSpec, WorkerTask } from "../src/orchestra/types.js";
import type { Provider } from "../src/provider/provider.js";
import { BudgetTracker } from "../src/safety/budget.js";
import type { Tool } from "../src/tools/tool.js";
import { fakeModel } from "./helpers.js";

/** A spec with the required fields filled in; override what a test is about. */
export function makeSpec(over: Partial<AgentSpec> & { name: string }): AgentSpec {
	return {
		description: `Use for ${over.name} work`,
		worker: "internal",
		prompt: `You are ${over.name}.`,
		source: `/fixtures/${over.name}.md`,
		scope: "global",
		...over,
	};
}

/** The registry surface the router needs; loading is registry.ts's business. */
export function fakeRegistry(specs: AgentSpec[]): AgentRegistry {
	return {
		list: () => [...specs],
		get: (name) => specs.find((s) => s.name === name),
		reload: async () => [],
	};
}

export function makeCtx(repo: string, provider: Provider, tools: Tool[]): LoopCtx {
	const parent: CreateAgentOpts = {
		provider,
		model: fakeModel,
		tools,
		task: "parent task",
		repoRoot: repo,
	};
	return {
		parent,
		budget: new BudgetTracker({ maxCostUsd: 10, deadlineMs: null }, Date.now()),
		parentSessionId: "parent-session",
		depth: 1,
	};
}

export function makeTask(
	spec: AgentSpec,
	task: string,
	cwd: string,
	signal: AbortSignal,
): WorkerTask {
	return { spec, task, cwd, signal };
}

export function cfgWith(backends: ChatBackendConfig[]): AhConfig {
	return { ...DEFAULT_CONFIG, chat: { backends } };
}

function git(cwd: string, args: string[]): void {
	const res = spawnSync("git", args, { cwd, encoding: "utf8" });
	if ((res.status ?? 1) !== 0) throw new Error(`git ${args[0]} failed: ${res.stderr}`);
}

/** A repo with one commit, so HEAD exists and the tree can be diffed. */
export function initRepo(dir: string): void {
	git(dir, ["init", "-q", "-b", "main"]);
	writeFileSync(join(dir, "seed.txt"), "seed\n");
	git(dir, ["add", "-A"]);
	git(dir, [
		"-c",
		"user.name=test",
		"-c",
		"user.email=test@localhost",
		"-c",
		"commit.gpgsign=false",
		"commit",
		"-q",
		"-m",
		"seed",
	]);
}
