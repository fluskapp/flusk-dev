/**
 * `flusk prompt <task>` — the composed prompt for a new task, built entirely out
 * of what already happened here.
 *
 * The header is not decoration: a prompt you cannot audit is a prompt you
 * cannot trust, so every block names its source and the one line that
 * justifies its tokens BEFORE the body, and the body carries the sources
 * again so the text survives a copy-paste. `--copy` puts only the body on the
 * clipboard — the header is for the human, not the model.
 *
 * Exit code is always 0: an empty corpus is an answer ("nothing indexed
 * yet"), not a failure, and a shell pipeline should not break over it.
 */
import { spawnSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { buildIndex } from "../history/bm25.js";
import { composePrompt } from "../history/compose.js";
import { historyCards } from "../history/corpus.js";
import type { ComposedPrompt } from "../history/types.js";
import { buildWalkthrough } from "../history/walkthrough.js";
import { DEFAULT_BUDGET } from "../ui/api-history.js";
import { indexAge, NOTHING_INDEXED } from "./search-cmd.js";

export interface PromptArgs {
	repo?: string | undefined;
	budget?: string | undefined;
	json?: boolean | undefined;
	copy?: boolean | undefined;
	refresh?: boolean | undefined;
	out?: NodeJS.WritableStream;
}

/**
 * Wide enough for "commit <sha>". A path is elided in the MIDDLE: cutting from
 * the left made four different journals render as the identical label
 * "…irbenyossef-linof-base.md", because on the real corpus the tail is the
 * shared "-review-pr-NNN-<owner>-<repo>.md" suffix and the head is the date.
 */
const SOURCE_W = 30;

function elide(source: string, width = SOURCE_W): string {
	if (source.length <= width) return source;
	const head = Math.ceil((width - 1) / 2);
	return `${source.slice(0, head)}…${source.slice(source.length - (width - head - 1))}`;
}

/** The prompt itself — what `--copy` copies and what a model would receive. */
export function renderPrompt(prompt: ComposedPrompt): string {
	const parts = prompt.blocks.map((b) => `## ${b.source}\n${b.text.trim()}\n`);
	if (prompt.constraints.length > 0) {
		parts.push(`## Constraints\n${prompt.constraints.map((c) => `- ${c}`).join("\n")}\n`);
	}
	return parts.join("\n");
}

function plural(n: number, one: string): string {
	return `${n} ${one}${n === 1 ? "" : "s"}`;
}

/** What went in and why, one line each — the part you read before trusting. */
function header(prompt: ComposedPrompt, scope: string, cards: number): string {
	const counts = [
		`${prompt.tokens} tokens`,
		plural(prompt.blocks.length, "block"),
		`${prompt.omitted} omitted`,
		plural(prompt.constraints.length, "constraint"),
	];
	const lines = [
		`prompt for "${prompt.task}" — ${counts.join(" · ")}`,
		`scope: ${scope} · ${cards} cards · ${indexAge()}`,
	];
	for (const b of prompt.blocks) lines.push(`  ${elide(b.source).padEnd(SOURCE_W)} ${b.why}`);
	return `${lines.join("\n")}\n\n`;
}

/** macOS clipboard when there is one; never throws, never blocks the output. */
function pbcopy(text: string): boolean {
	try {
		const res = spawnSync("pbcopy", { input: text });
		return res.error === undefined && res.status === 0;
	} catch {
		return false;
	}
}

/** `flusk prompt <task> [--repo path] [--budget n] [--json] [--copy]`. */
export function promptCmd(task: string, args: PromptArgs = {}): number {
	const out = args.out ?? process.stdout;
	// `flusk prompt … | head` closes the pipe mid-write; that is the reader's
	// choice, not a failure worth a stack trace.
	out.on("error", () => {});
	const budget = args.budget === undefined ? DEFAULT_BUDGET : Number(args.budget);
	if (!Number.isInteger(budget) || budget <= 0) {
		// Exit 1 like `flusk search`'s --limit/--kind: a typo'd flag is an error a
		// script must be able to see. Exit 0 is reserved for "nothing indexed".
		out.write("flusk: --budget must be a positive integer\n");
		return 1;
	}
	const asked = args.repo === undefined ? undefined : basename(resolve(args.repo));
	const all = historyCards({ refresh: args.refresh === true });
	// Scoping the CARDS, not just the query, is what makes "nothing indexed
	// yet for <repo>" answerable and keeps the index this builds small.
	const scoped = asked === undefined ? all : all.filter((c) => c.project === asked);
	// `repo` defaults to the working directory, so running from anywhere that
	// is not an indexed project would otherwise dead-end on an empty prompt.
	// Widening beats refusing: say the scope changed and answer the question.
	const widened = asked !== undefined && scoped.length === 0 && all.length > 0;
	const project = widened ? undefined : asked;
	const cards = widened ? all : scoped;
	const walkthrough = buildWalkthrough(buildIndex(cards), task, {
		...(project !== undefined ? { project } : {}),
	});
	const prompt = composePrompt(walkthrough, task, { budget });
	if (args.json === true) {
		out.write(`${JSON.stringify(prompt, null, 2)}\n`);
		return 0;
	}
	if (cards.length === 0) {
		out.write(project === undefined ? NOTHING_INDEXED : `nothing indexed yet for ${project}\n`);
		return 0;
	}
	const body = renderPrompt(prompt);
	if (widened) {
		out.write(`scope: ${asked} has no indexed history — searching all projects\n`);
	}
	out.write(header(prompt, project ?? "all projects", cards.length));
	out.write(body);
	if (args.copy === true) {
		out.write(pbcopy(body) ? "\ncopied to clipboard\n" : "\nclipboard unavailable (no pbcopy)\n");
	}
	return 0;
}
