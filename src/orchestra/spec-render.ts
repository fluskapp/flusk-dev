/**
 * A draft → the exact bytes of `<name>.md`. The output is plain markdown a
 * human can open and edit, which is the entire point of generating a FILE
 * rather than an in-memory object: the agent ah invented at 1am is reviewable
 * in the morning and fixable with any editor.
 *
 * The rendered file is a PROMPT, never code. Nothing executes it, so the only
 * safety property here is round-trip integrity: every scalar is flattened to
 * one line and the description is quoted, so a value containing `:` or a
 * newline cannot forge a second frontmatter key. The body is written after
 * the closing fence, where no content can re-open the header.
 */
import type { SpecDraft } from "./spec-draft.js";

/** Frontmatter values are single-line and quote-free by construction. */
function scalar(value: string): string {
	return value.replace(/\s+/g, " ").replace(/["']/g, "").trim();
}

/** Only `Tool.name`-shaped tokens survive: the list must re-parse as a list. */
function toolLine(tools: string[] | undefined): string[] {
	if (tools === undefined) return [];
	const safe = tools.filter((t) => /^[\w.-]+$/.test(t));
	return [`tools: [${safe.join(", ")}]`];
}

export function renderAgentSpec(draft: SpecDraft): string {
	const header = [
		"---",
		`name: ${scalar(draft.name)}`,
		`description: "${scalar(draft.description)}"`,
		`worker: ${scalar(draft.worker)}`,
		...(draft.backendId !== undefined ? [`backendId: ${scalar(draft.backendId)}`] : []),
		...(draft.model !== undefined ? [`model: ${scalar(draft.model)}`] : []),
		...toolLine(draft.tools),
		"---",
	];
	return `${header.join("\n")}\n\n${draft.prompt.trim()}\n`;
}
