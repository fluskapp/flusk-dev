/**
 * Launching a run configuration. The file on disk is the truth — read fresh
 * at launch, never a cached form state — and the red-line rules refuse a hard
 * error with the same message the dialog shows. The run itself goes through
 * startRealRun → runCmd: byte-for-byte the CLI's machinery, so a config run
 * is not one drop weaker than the identical shell invocation.
 */
import { resolve } from "node:path";
import { Writable } from "node:stream";
import { runCmd } from "../../cli/run-cmd.js";
import { loadConfig } from "../../platform/config/config.js";
import type { TaskKind } from "../../platform/config/types.js";
import { dryHarnessPlan, startHarnessRun } from "../harnesses/launch.repository.js";
import { expandHome } from "../projects/journal-scan.repository.js";
import { projectRoots } from "../projects/project-scan.repository.js";
import { type LiveRun, startRealRun } from "../run/run-manager.repository.js";
import { readRunConfig } from "./runconfig-files.repository.js";
import { toRunCmdOpts } from "./runconfig-opts.js";
import { validateRunConfig } from "./runconfig-validate.js";
import type { RunConfigMeta } from "./runconfig.types.js";

type Opened = { ok: true; config: RunConfigMeta; root: string } | { ok: false; why: string };

/**
 * Reads the named config fresh off disk and applies the red-line rules. The
 * run's root is config.repo when set (which must then be a CONFIGURED project
 * root — the specRoot membership idiom, never a prefix test), else the
 * caller's repo. Warnings never block; the first hard error is the refusal.
 */
function openForRun(repoRoot: string, name: string): Opened {
	const opened = readRunConfig(repoRoot, name);
	if (!opened.ok) return { ok: false, why: opened.why };
	const config = opened.meta;
	const root = config.repo === undefined ? repoRoot : resolve(expandHome(config.repo));
	const repoOk =
		config.repo === undefined ? null : projectRoots(loadConfig(process.cwd())).includes(root);
	// harness: null = not probed here; the hard gate is readHarness in
	// startHarnessRun, same message as the dialog, file fresh off disk.
	const issues = validateRunConfig(config, { repoOk, verifyCommands: null, harness: null });
	const hard = issues.find((i) => i.level === "error");
	if (hard !== undefined) return { ok: false, why: hard.message };
	return { ok: true, config, root };
}

export type Launched = { ok: true; run: LiveRun } | { ok: false; why: string };

/** Starts the named config's run in-process; the id is live immediately. */
export async function launchRunConfig(repoRoot: string, name: string): Promise<Launched> {
	const opened = openForRun(repoRoot, name);
	if (!opened.ok) return opened;
	if (opened.config.harness !== undefined && opened.config.harness !== "native") {
		return startHarnessRun(opened.config, opened.root);
	}
	const run = await startRealRun(toRunCmdOpts(opened.config, opened.root));
	return { ok: true, run };
}

export type DryPlanned = { ok: true; plan: string } | { ok: false; why: string };

/**
 * The composed dry plan — kind, model, toolbelt, isolation, the exact system
 * prompt — captured for the dialog's preview pane. Nothing starts: runCmd's
 * own --dry branch returns before providers, isolation or the agent exist.
 */
export async function dryRunConfig(repoRoot: string, name: string): Promise<DryPlanned> {
	const opened = openForRun(repoRoot, name);
	if (!opened.ok) return opened;
	if (opened.config.harness !== undefined && opened.config.harness !== "native") {
		return dryHarnessPlan(opened.config, opened.root); // never spawns
	}
	const { task, repoRoot: root, kind, ...extras } = toRunCmdOpts(opened.config, opened.root);
	const lines: string[] = [];
	const out = new Writable({
		write(chunk: Buffer, _enc, cb) {
			lines.push(chunk.toString("utf8"));
			cb();
		},
	});
	try {
		await runCmd({
			...extras,
			task,
			repo: root,
			real: true,
			...(kind !== undefined ? { kind: kind as TaskKind } : {}),
			dry: true,
			quiet: true,
			out,
		});
	} catch (e) {
		return { ok: false, why: e instanceof Error ? e.message : String(e) };
	}
	return { ok: true, plan: lines.join("") };
}
