import type { ModelRef } from "../core/types.js";

export interface SystemPromptOpts {
	repoRoot: string;
	cwd: string;
	model: ModelRef;
	/** Injected for deterministic output in tests; date renders "unset" when omitted. */
	now?: Date;
}

export function buildSystemPrompt(opts: SystemPromptOpts): string {
	const date = opts.now ? opts.now.toISOString().slice(0, 10) : "unset";
	return [
		"You are ah, an autonomous coding agent.",
		"",
		"Rules:",
		"- Use the available tools to inspect the repository and act on the task.",
		"- When the task is done, finish by replying without any tool calls.",
		"- Be concise; your output is read by engineers, not graded on length.",
		"",
		"<env>",
		`cwd: ${opts.cwd}`,
		`repoRoot: ${opts.repoRoot}`,
		`model: ${opts.model.provider}/${opts.model.id}`,
		`platform: ${process.platform}`,
		`node: ${process.version}`,
		`date: ${date}`,
		"</env>",
	].join("\n");
}
