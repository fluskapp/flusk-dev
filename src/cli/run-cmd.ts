import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createAgent } from "../agent/agent.js";
import { buildSystemPrompt } from "../agent/system-prompt.js";
import { loadConfig } from "../config/config.js";
import type { HitConfig, TaskKind } from "../config/types.js";
import { createEventBus } from "../core/events.js";
import type { AssistantMsg, ModelRef, RunEndReason } from "../core/types.js";
import { zeroUsage } from "../core/types.js";
import { assistantText, assistantToolCalls, FakeProvider, type ScriptedTurn } from "../provider/fake.js";
import { classifyTask } from "../provider/intent.js";
import { hasAuth, PiAiProvider, resolveModelRef } from "../provider/pi-ai.js";
import { chooseModel } from "../provider/router.js";
import { loadScores } from "../provider/scores.js";
import { ensureCleanTree, isGitRepo, startRunBranch, summarizeRun } from "../safety/git-isolation.js";
import { createHitPolicy } from "../safety/hit-policy.js";
import { bashTool } from "../tools/bash.js";
import { editTool } from "../tools/edit.js";
import { globTool } from "../tools/glob.js";
import { grepTool } from "../tools/grep.js";
import { readTool } from "../tools/read.js";
import { writeTool } from "../tools/write.js";
import { attachRenderer } from "./render.js";

export interface RunCmdOpts {
	task: string;
	repo: string;
	/** Path to a JSON file with an array of ScriptedTurn entries. */
	fake?: string;
	/** Use the real provider. Without this and without `fake`, the demo script runs. */
	real?: boolean;
	/** "provider/id" override; skips the router. */
	model?: string;
	kind?: TaskKind;
	maxCostUsd?: number;
	deadlineMs?: number;
	maxTurns?: number;
	dry?: boolean;
	noIsolation?: boolean;
	allowDirty?: boolean;
	quiet?: boolean;
	out?: NodeJS.WritableStream;
}

export const fakeModel: ModelRef = { provider: "fake", id: "fake-1", contextWindow: 200_000 };
export const DEFAULT_TOOLS = [readTool, bashTool, writeTool, editTool, globTool, grepTool];

/** Conventional API-key env var for a provider (anthropic → ANTHROPIC_API_KEY). */
export const envKeyVar = (provider: string): string =>
	`${provider.toUpperCase().replace(/-/g, "_")}_API_KEY`;

/** Built-in script used when --fake is not given: one tool call, then a wrap-up. */
function demoScript(): ScriptedTurn[] {
	const finale = "Demo complete — the loop, tools, sessions and renderer all work.";
	return [
		{ message: assistantToolCalls([{ id: "demo-1", name: "bash", args: { command: "echo hello from hit" } }]) },
		{ deltas: [{ channel: "text", text: finale }], message: assistantText(finale) },
	];
}

/** Parses a --fake JSON array, filling missing deltas ([]) and usage (zeros). */
export async function loadFakeScript(source: string): Promise<ScriptedTurn[]> {
	const raw: unknown = JSON.parse(await readFile(source, "utf8"));
	if (!Array.isArray(raw)) throw new Error(`fake script must be a JSON array: ${source}`);
	return raw.map((entry, i) => {
		const turn = entry as { deltas?: ScriptedTurn["deltas"]; message?: Partial<AssistantMsg> };
		const msg = turn?.message;
		if (msg?.role !== "assistant" || !Array.isArray(msg.content) || typeof msg.stopReason !== "string") {
			throw new Error(`fake script entry ${i} lacks a valid assistant message: ${source}`);
		}
		const usage = typeof msg.usage === "object" && msg.usage !== null ? { ...zeroUsage(), ...msg.usage } : zeroUsage();
		return { deltas: turn.deltas ?? [], message: { ...msg, usage } as AssistantMsg };
	});
}

async function pickModel(cfg: HitConfig, kind: TaskKind, override?: string): Promise<ModelRef> {
	if (override === undefined) return chooseModel(cfg, kind, await loadScores()).ref;
	const slash = override.indexOf("/");
	if (slash <= 0 || slash === override.length - 1) {
		throw new Error(`--model must look like "provider/id", got "${override}"`);
	}
	return resolveModelRef({ provider: override.slice(0, slash), id: override.slice(slash + 1) });
}

/** Phase 2 run command: config → kind → routed model, hit policy, git isolation
 * with per-turn checkpoints. Never calls process.exit; returns the RunEndReason. */
export async function runCmd(opts: RunCmdOpts): Promise<RunEndReason> {
	const out = opts.out ?? process.stdout;
	const cfg = loadConfig(opts.repo);
	if (opts.maxCostUsd !== undefined) cfg.budgets.maxCostUsd = opts.maxCostUsd;
	if (opts.deadlineMs !== undefined) cfg.budgets.deadlineMinutes = opts.deadlineMs / 60_000;
	if (opts.maxTurns !== undefined) cfg.budgets.maxTurns = opts.maxTurns;
	const isFake = opts.fake !== undefined || opts.real !== true;
	const kind: TaskKind = opts.kind ?? classifyTask(opts.task);
	const model = isFake ? fakeModel : await pickModel(cfg, kind, opts.model);
	const inRepo = isGitRepo(opts.repo);

	if (opts.dry === true) {
		const plan = opts.noIsolation === true
			? "off (--no-isolation)"
			: inRepo
				? `branch ${cfg.isolation.branchPrefix}<run-id>, checkpoint commit per mutating turn`
				: "off (not a git repository)";
		const tools = [...DEFAULT_TOOLS.map((t) => t.name), "task"].join(", ");
		const prompt = buildSystemPrompt({ repoRoot: opts.repo, cwd: opts.repo, model });
		out.write(`kind: ${kind}\nmodel: ${model.provider}/${model.id}\ntools: ${tools}\n` +
			`isolation: ${plan}\n--- system prompt ---\n${prompt}\n`);
		return "completed";
	}
	if (!isFake && !(await hasAuth(model.provider))) {
		throw new Error(`no credentials for provider "${model.provider}"; set ${envKeyVar(model.provider)}`);
	}
	let isolation: { branch: string; originalRef: string } | undefined;
	if (!inRepo && opts.noIsolation !== true && !isFake && cfg.isolation.requireGit) {
		throw new Error(`${opts.repo} is not a git repository; hit isolates runs on a branch (pass --no-isolation to override)`);
	}
	if (inRepo && opts.noIsolation !== true) {
		if (opts.allowDirty !== true) ensureCleanTree(opts.repo);
		isolation = startRunBranch(opts.repo, randomUUID().slice(0, 8), cfg.isolation.branchPrefix);
	}
	const provider = isFake
		? new FakeProvider(opts.fake !== undefined ? await loadFakeScript(opts.fake) : demoScript())
		: new PiAiProvider();
	const events = createEventBus();
	if (opts.quiet !== true) attachRenderer(events, out);
	const agent = createAgent({
		provider,
		model,
		tools: DEFAULT_TOOLS,
		task: opts.task,
		repoRoot: opts.repo,
		policy: createHitPolicy({ config: cfg, repoRoot: opts.repo }),
		events,
		config: cfg,
		taskKind: kind,
		...(opts.deadlineMs !== undefined ? { limits: { maxTurns: cfg.budgets.maxTurns, deadlineMs: opts.deadlineMs } } : {}),
		...(isolation !== undefined ? { isolation: { repoRoot: opts.repo, branch: isolation.branch } } : {}),
	});
	try {
		const { reason, stats } = await agent.run();
		out.write(`${reason} · ${stats.turns} turns · $${stats.usage.costUsd.toFixed(4)} · ${agent.session.path}\n`);
		if (isolation !== undefined) {
			out.write(`${summarizeRun(opts.repo, isolation.branch, isolation.originalRef)}\n`);
		}
		return reason;
	} finally {
		agent.session.close();
	}
}
