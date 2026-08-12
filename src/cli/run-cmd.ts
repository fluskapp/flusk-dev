import { randomUUID } from "node:crypto";
import { createAgent } from "../features/run/agent.js";
import { buildSystemPrompt } from "../features/run/system-prompt.js";
import { loadConfig, loadRepoConfig } from "../platform/config/config.js";
import type { FluskConfig, RepoConfig, TaskKind } from "../platform/config/types.js";
import { createEventBus, type EventBus } from "../platform/events/events.js";
import { resolveNamespace } from "../features/facts/namespaces.js";
import { FakeProvider } from "../features/provider/fake.js";
import { classifyTask } from "../features/provider/intent.js";
import { hasAuth, PiAiProvider } from "../features/provider/pi-ai.js";
import { createFluskPolicy } from "../features/safety/flusk-policy.js";
import { ensureCleanTree, isGitRepo, startRunBranch, summarizeRun } from "../features/safety/git-isolation.repository.js";
import { createFactStore } from "../features/facts/facts.repository.js";
import { toolbelt } from "./ext-tools.js";
import { type CliOutcome, runWithGate } from "./gate-loop.js";
import { attachRenderer } from "./render.js";
import { demoScript, envKeyVar, fakeModel, loadFakeScript, pickModel } from "./run-support.js";

export { DEFAULT_TOOLS, envKeyVar, fakeModel, loadFakeScript } from "./run-support.js";

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
	/** Skip the verification gate (commands and claim check) entirely. */
	noVerify?: boolean;
	quiet?: boolean;
	/** `--no-extensions`: run with the built-in toolbelt alone, for one command. */
	noExtensions?: boolean;
	out?: NodeJS.WritableStream;
	/**
	 * Config resolved by the caller, used INSTEAD of reading `<repo>/.flusk/config.json`.
	 * Unattended mode passes this because its `repo` is a worktree of a branch
	 * under review: a hostile `.flusk/config.json` there could otherwise disable the
	 * command classifier, add a verify command to execute, or redirect memory.
	 */
	trustedConfig?: { cfg: FluskConfig; repoConfig: RepoConfig | undefined; namespace?: string };
}

/** DEFAULT_TOOLS plus whatever the extensions registered — the seam that makes
 * src/ext/ reachable at all (src/cli/ext-tools.ts). */
const belt = (o: RunCmdOpts, cfg: FluskConfig, events?: EventBus) =>
	toolbelt({ repoRoot: o.repo, config: cfg, out: o.out ?? process.stdout,
		quiet: o.quiet === true, ...(events === undefined ? {} : { events }),
		...(o.noExtensions === true ? { noExtensions: true } : {}) });

/** Phase 3 run command: config → routed model, flusk policy, git isolation,
 * then the run + verification gate. Never calls process.exit; returns the CLI
 * outcome ("blocked" = gate failure, exit 1). */
export async function runCmd(opts: RunCmdOpts): Promise<CliOutcome> {
	const out = opts.out ?? process.stdout;
	const cfg = opts.trustedConfig?.cfg ?? loadConfig(opts.repo);
	const repoConfig =
		opts.trustedConfig !== undefined
			? // Keep the caller's namespace so the run's memory lands where the
				// caller will read it, not in a namespace derived from a temp path.
				{ ...opts.trustedConfig.repoConfig, ...(opts.trustedConfig.namespace !== undefined ? { namespace: opts.trustedConfig.namespace } : {}) }
			: loadRepoConfig(opts.repo);
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
		// The REAL toolbelt, extensions included: anything else answers a
		// different question from the one --dry is asked.
		const tools = [...(await belt(opts, cfg)).map((t) => t.name), "task"].join(", ");
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
		throw new Error(`${opts.repo} is not a git repository; flusk isolates runs on a branch (pass --no-isolation to override)`);
	}
	if (inRepo && opts.noIsolation !== true) {
		if (opts.allowDirty !== true) ensureCleanTree(opts.repo);
		isolation = startRunBranch(opts.repo, randomUUID().slice(0, 8), cfg.isolation.branchPrefix);
	}
	const provider = isFake
		? new FakeProvider(opts.fake !== undefined ? await loadFakeScript(opts.fake) : demoScript())
		: new PiAiProvider();
	// `memory.enabled: false` is a request to leave no trace: the gate still
	// runs, it just has nowhere to write the run's facts of record.
	const ns = resolveNamespace(opts.repo, repoConfig);
	const store = cfg.memory.enabled ? createFactStore() : null;
	const events = createEventBus();
	if (opts.quiet !== true) attachRenderer(events, out);
	const agent = createAgent({
		provider,
		model,
		tools: await belt(opts, cfg, events),
		task: opts.task,
		repoRoot: opts.repo,
		policy: createFluskPolicy({ config: cfg, repoRoot: opts.repo }),
		events,
		config: cfg,
		taskKind: kind,
		...(opts.deadlineMs !== undefined ? { limits: { maxTurns: cfg.budgets.maxTurns, deadlineMs: opts.deadlineMs } } : {}),
		...(isolation !== undefined ? { isolation: { repoRoot: opts.repo, branch: isolation.branch } } : {}),
	});
	try {
		const res = await runWithGate(agent, {
			cfg,
			repoRoot: opts.repo,
			repoConfig,
			store,
			ns,
			out,
			noVerify: opts.noVerify === true,
		});
		// The OUTCOME, not the loop's reason: a run whose report was blocked must
		// not print "completed".
		out.write(
			`${res.outcome} · ${res.stats.turns} turns · $${res.stats.usage.costUsd.toFixed(4)} · ${agent.session.path}\n`,
		);
		if (isolation !== undefined) {
			out.write(`${summarizeRun(opts.repo, isolation.branch, isolation.originalRef)}\n`);
		}
		return res.outcome;
	} finally {
		agent.session.close();
	}
}
