/**
 * `--dry`: the run as it WOULD be — kind, model, toolbelt, isolation plan and
 * the exact system prompt — printed without calling anything. Presentation
 * only; every value arrives already decided by run-cmd.
 */
import type { FluskConfig, TaskKind } from "../platform/config/types.js";
import { buildSystemPrompt } from "../features/run/system-prompt.js";
import type { ModelRef } from "../features/run/run.types.js";
import type { Tool } from "../features/tools/tool.js";
import type { RunCmdOpts } from "./run-cmd.js";

export function renderDryPlan(input: {
	cfg: FluskConfig;
	opts: RunCmdOpts;
	inRepo: boolean;
	kind: TaskKind;
	model: ModelRef;
	tools: Tool[];
}): string {
	const { cfg, opts, inRepo, kind, model } = input;
	const plan =
		opts.noIsolation === true
			? "off (--no-isolation)"
			: inRepo
				? `branch ${cfg.isolation.branchPrefix}<run-id>, checkpoint commit per mutating turn`
				: "off (not a git repository)";
	const tools = [...input.tools.map((t) => t.name), "task"].join(", ");
	const prompt = buildSystemPrompt({ repoRoot: opts.repo, cwd: opts.repo, model });
	return (
		`kind: ${kind}\nmodel: ${model.provider}/${model.id}\ntools: ${tools}\n` +
		`isolation: ${plan}\n--- system prompt ---\n${prompt}\n`
	);
}
