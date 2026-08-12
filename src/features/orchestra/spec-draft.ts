/**
 * The fields of an agent about to be written to disk, and the OFFLINE path.
 *
 * `genericDraft` is why the orchestrator still works with no model, no key
 * and no network: it is a deterministic, task-shaped spec, not a placeholder.
 * A seam whose "create an agent" step needs a model to produce anything is a
 * seam that dies exactly when you most need to delegate.
 *
 * `normaliseDraft` is the funnel every drafter — model or fallback — goes
 * through, because a model's proposal is untrusted text: the name is coerced
 * to a safe filename here (see spec-name.ts), the description is flattened to
 * one line so it cannot forge extra frontmatter keys, and an unknown worker
 * kind falls back to "internal", the kind that can name no binary.
 */

import { deriveAgentName, safeAgentName, uniqueAgentName } from "./spec-name.js";
import type { AgentWorkerKind } from "./types.js";

export interface SpecDraft {
	name: string;
	description: string;
	worker: AgentWorkerKind;
	backendId?: string;
	model?: string;
	tools?: string[];
	prompt: string;
}

/**
 * Proposes spec fields for a task. Returns null when no model is available —
 * a null is the offline signal, not an error, and it never throws.
 */
export type SpecDrafter = (
	task: string,
	signal?: AbortSignal,
) => Promise<Partial<SpecDraft> | null>;

const KINDS: ReadonlySet<string> = new Set<AgentWorkerKind>(["internal", "cli", "http"]);

/** One line, no quotes: the value has to survive a frontmatter round trip. */
function oneLine(text: string, max = 160): string {
	const flat = text.replace(/\s+/g, " ").replace(/["']/g, "").trim();
	return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/** The offline spec: generic instructions, but named and scoped by the task. */
export function genericDraft(task: string): SpecDraft {
	const summary = oneLine(task, 120);
	return {
		name: deriveAgentName(task),
		// Terse on purpose: every extra word of boilerplate here is a term the
		// router has to match, and dilutes the task's own words to the point
		// where re-running the same task creates a second identical agent.
		description: `Use for: ${summary}`,
		worker: "internal",
		prompt:
			"You are a focused sub-agent handling one self-contained task in this repository.\n\n" +
			`You were created for work of this kind:\n\n> ${summary}\n\n` +
			"Read the relevant files before changing anything, make the smallest change that " +
			"satisfies the task, follow the conventions already present in the files you touch, " +
			"and verify your work with the repository's own checks. Report what you changed, " +
			"with absolute paths, and state anything you could not verify.\n\n" +
			"This file is a plain prompt: edit it to make the agent yours.",
	};
}

/** A drafter's proposal merged over the offline draft, every field made safe. */
export function normaliseDraft(
	proposal: Partial<SpecDraft> | null,
	task: string,
	taken: ReadonlySet<string>,
): SpecDraft {
	const base = genericDraft(task);
	const p = proposal ?? {};
	const asked = KINDS.has(p.worker ?? "") ? (p.worker as AgentWorkerKind) : base.worker;
	// A cli/http spec without a backendId would be refused by the very next
	// reload, so the file we are about to write would be dead on arrival.
	// Downgrading to "internal" keeps the created agent runnable.
	const worker = asked !== "internal" && (p.backendId ?? "") === "" ? "internal" : asked;
	const tools = p.tools?.map((t) => t.trim()).filter((t) => /^[\w.-]+$/.test(t));
	const description = oneLine(p.description ?? "") || base.description;
	const prompt = (p.prompt ?? "").trim() || base.prompt;
	return {
		name: uniqueAgentName(safeAgentName(p.name ?? "") || base.name, taken),
		description,
		worker,
		...(worker !== "internal" && p.backendId !== undefined
			? { backendId: oneLine(p.backendId, 64) }
			: {}),
		...(worker !== "internal" && p.model !== undefined ? { model: oneLine(p.model, 64) } : {}),
		...(tools !== undefined ? { tools: [...new Set(tools)] } : {}),
		prompt,
	};
}
