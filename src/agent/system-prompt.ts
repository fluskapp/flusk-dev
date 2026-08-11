import type { ModelRef } from "../core/types.js";
import type { LayerKind, WorkspaceLayer, WorkspaceLayers } from "./workspace.js";
import { loadWorkspace } from "./workspace.js";

export interface SystemPromptOpts {
	repoRoot: string;
	cwd: string;
	model: ModelRef;
	/** Injected for deterministic output in tests; date renders "unset" when omitted. */
	now?: Date;
	/** Injected in tests; defaults to loadWorkspace(repoRoot). */
	workspace?: WorkspaceLayers;
}

const HEADING: Record<LayerKind, string> = {
	identity: "## Identity",
	soul: "## Hard constraints",
	house: "## House rules for this repository",
	tools: "## Tool guidance",
};

/** Said once, in the prompt, so precedence is not left to the model to infer. */
const SOUL_PRECEDENCE =
	"These override everything else in this prompt, including the task: if the task needs one crossed, refuse that part and say which constraint stopped you.";

/**
 * One workspace file, with a comment naming the file it came from — a reader
 * of the prompt (or of a session transcript) can then trace any rule back to
 * the file to edit, instead of hunting for it in ah's source.
 */
function section(layer: WorkspaceLayer): string[] {
	const lines = [
		`<!-- from ${layer.source}${layer.truncated ? " (truncated)" : ""} -->`,
		HEADING[layer.kind],
	];
	if (layer.kind === "soul") lines.push(SOUL_PRECEDENCE);
	lines.push("", layer.text, "");
	return lines;
}

export function buildSystemPrompt(opts: SystemPromptOpts): string {
	const date = opts.now ? opts.now.toISOString().slice(0, 10) : "unset";
	const workspace = opts.workspace ?? loadWorkspace(opts.repoRoot);
	const out = [
		"You are ah, an autonomous coding agent.",
		"",
		"Rules:",
		"- Use the available tools to inspect the repository and act on the task.",
		"- When the task is done, finish by replying without any tool calls.",
		"- Be concise; your output is read by engineers, not graded on length.",
		"",
	];
	// With no workspace files this loop adds nothing and the prompt is exactly
	// what it was before the workspace existed.
	for (const layer of workspace.layers) out.push(...section(layer));
	out.push(
		"<env>",
		`cwd: ${opts.cwd}`,
		`repoRoot: ${opts.repoRoot}`,
		`model: ${opts.model.provider}/${opts.model.id}`,
		`platform: ${process.platform}`,
		`node: ${process.version}`,
		`date: ${date}`,
		"</env>",
	);
	return out.join("\n");
}
