/**
 * The run-configuration feature's typed server functions — what the dialog
 * and the toolbar runner widget call. Bodies delegate to the repositories;
 * the only logic here is the root check: a request names a CONFIGURED project
 * root or it is refused, the same membership test the spec functions use
 * (never a prefix test). Type-only re-exports keep this file strippable.
 */
import { resolve } from "node:path";
import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import { loadConfig, loadRepoConfig } from "../../platform/config/config.js";
import { expandHome } from "../projects/journal-scan.repository.js";
import { projectRoots } from "../projects/project-scan.repository.js";
import { detectVerifyCommands } from "../verify/detect.repository.js";
import {
	deleteRunConfigFile,
	saveRunConfigFile,
	scanRunConfigs,
} from "./runconfig-files.repository.js";
import { dryRunConfig, launchRunConfig } from "./runconfig-launch.repository.js";
import { parseRunConfig } from "./runconfig-parse.js";
import type {
	DryReply,
	LaunchReply,
	RunConfigScan,
	RunConfigScope,
	RunConfigWriteReply,
} from "./runconfig.types.js";

export type {
	DryReply,
	LaunchReply,
	RunConfig,
	RunConfigBudgets,
	RunConfigIsolation,
	RunConfigIssue,
	RunConfigKind,
	RunConfigMeta,
	RunConfigScan,
	RunConfigScope,
	RunConfigWriteReply,
} from "./runconfig.types.js";

const NOT_ROOT = "not a configured project root";

/** The configured root this request names, or null. */
const configRoot = createServerOnlyFn((raw: string): string | null => {
	const path = resolve(expandHome(raw));
	return projectRoots(loadConfig(process.cwd())).includes(path) ? path : null;
});

/** Every config the repo can launch — the dialog's list, skipped files included. */
export const getRunConfigs = createServerFn()
	.inputValidator((data: { repo: string }) => data)
	.handler(async ({ data }): Promise<RunConfigScan> => {
		const root = configRoot(data.repo);
		if (root === null) return { configs: [], skipped: [{ path: data.repo, why: NOT_ROOT }] };
		return scanRunConfigs(root);
	});

/** Saves the form's config; the payload is re-parsed, never trusted as shaped. */
export const saveRunConfig = createServerFn({ method: "POST" })
	.inputValidator((data: { repo: string; name: string; scope: RunConfigScope; config: unknown }) => data)
	.handler(async ({ data }): Promise<RunConfigWriteReply> => {
		const root = configRoot(data.repo);
		if (root === null) return { ok: false, why: NOT_ROOT };
		const parsed = parseRunConfig(data.config);
		if (!parsed.ok) return { ok: false, why: parsed.why };
		try {
			return { ok: true, path: saveRunConfigFile(root, data.name, parsed.config, data.scope) };
		} catch (e) {
			return { ok: false, why: e instanceof Error ? e.message : String(e) };
		}
	});

export const deleteRunConfig = createServerFn({ method: "POST" })
	.inputValidator((data: { repo: string; name: string; scope: RunConfigScope }) => data)
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		const root = configRoot(data.repo);
		return { ok: root !== null && deleteRunConfigFile(root, data.name, data.scope) };
	});

/** Runs the named config through the CLI's machinery; the id is live at once. */
export const launchConfig = createServerFn({ method: "POST" })
	.inputValidator((data: { repo: string; name: string }) => data)
	.handler(async ({ data }): Promise<LaunchReply> => {
		const root = configRoot(data.repo);
		if (root === null) return { ok: false, why: NOT_ROOT };
		const r = await launchRunConfig(root, data.name);
		return r.ok ? { ok: true, runId: r.run.runId, task: r.run.task } : r;
	});

/** The dry plan for the dialog's preview pane; nothing starts. */
export const dryConfig = createServerFn({ method: "POST" })
	.inputValidator((data: { repo: string; name: string }) => data)
	.handler(async ({ data }): Promise<DryReply> => {
		const root = configRoot(data.repo);
		if (root === null) return { ok: false, why: NOT_ROOT };
		return dryRunConfig(root, data.name);
	});

/**
 * The validation probe behind the dialog's amber line: the commands the gate
 * would run in `repo`. Empty means "repo has no verify commands" — a warning,
 * never a block. The red-line half is pure (runconfig-validate.ts) and runs
 * client-side; this function supplies the fact only the server can know.
 */
export const getVerifyStatus = createServerFn()
	.inputValidator((data: { repo: string }) => data)
	.handler(async ({ data }): Promise<{ commands: string[] } | null> => {
		const root = configRoot(data.repo);
		return root === null ? null : { commands: detectVerifyCommands(root, loadRepoConfig(root)) };
	});
