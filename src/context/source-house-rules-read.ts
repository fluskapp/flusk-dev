/**
 * Reading a rules FILE, and turning one into a ContextItem.
 *
 * Split from the source itself because the two jobs fail differently: reading
 * is where the I/O and the redaction live, assembly is where provenance and the
 * token count live, and a 150-line file that does both hides whichever one is
 * wrong. Nothing here throws; a file that cannot be read is a file that is not
 * there, plus a note (L7).
 *
 * Two traps are already paid for elsewhere and must not be re-paid here:
 * readLayerText() redacts (L4 — one redactor, in src/history/scrub.ts) and
 * clip() cuts at a LINE boundary, so a rule is never quoted half-way through
 * the sentence that reverses it. And readLayerText writes ABSOLUTE paths into
 * its notes; those notes are repo-relativised before they leave this module,
 * because a note carrying $HOME reaches a report as surely as `text` does.
 */
import { basename, join } from "node:path";
import { clip, FILE_MAX, readLayerText } from "../agent/workspace-files.js";
import { estimateTokens } from "../history/budget.js";
import type { ContextItem, ContextTier } from "./types.js";

/** Stable id for this source, exported so the assembler can name it once. */
export const HOUSE_RULES_SOURCE = "house-rules";

/**
 * Rules text is quoted material: a cloned repo's CLAUDE.md must not be able to
 * redirect the run (L3). The item says so; the ASSEMBLER delimits it. Wrapping
 * it here as well would delimit it twice and put our own prose inside the quote.
 */
export interface HouseRuleItem extends ContextItem {
	trust: "untrusted";
}

export interface RuleFile {
	/** Repo-relative — an absolute path leaks $HOME into every downstream field. */
	rel: string;
	text: string;
	/** True when FILE_MAX cut it; reported in `why`, never silently (L2). */
	clipped: boolean;
}

/** readLayerText names the file by absolute path; the reader gets it relative. */
const relativise = (note: string, repoRoot: string): string => note.split(`${repoRoot}/`).join("");

/**
 * One rules file, redacted and clipped, or undefined when it is absent or empty
 * after redaction. Absence is silent on purpose — most repos have no AGENTS.md,
 * and a note per missing file would bury the notes that mean something.
 */
export function readRule(repoRoot: string, rel: string, notes: string[]): RuleFile | undefined {
	const local: string[] = [];
	const text = readLayerText(join(repoRoot, rel), local);
	for (const n of local) notes.push(relativise(n, repoRoot));
	if (text === undefined) return undefined;
	const cut = clip(text, FILE_MAX);
	return { rel, text: cut.text, clipped: cut.truncated };
}

/**
 * Exactly the text the block will hold: heading, provenance line, then the
 * quoted body. `tokens` is estimateTokens() over THIS string and nothing else,
 * so the heading and the `why` are paid for by the item that carries them
 * (invariant 7). The assembler's delimiters are its own fixed cost.
 */
export const renderedText = (title: string, why: string, body: string): string =>
	`${title}\n${why}\n${body}`;

export interface RuleItemSpec {
	file: RuleFile;
	/** Repo name, from basename(repoRoot). Never the absolute root. */
	project: string;
	/** Second half of the `why`: why THIS file was selected. */
	because: string;
	tier: ContextTier;
	/** 0-100, "how strongly this text governs the work"; 0 when pinned. */
	score: number;
	/** First markdown heading, when the doc scan already found one. */
	docTitle?: string;
}

const heading = (rel: string, docTitle?: string): string =>
	docTitle === undefined || docTitle === basename(rel) ? rel : `${rel} — ${docTitle}`;

/**
 * `why` names the file, the repo and the reason (L1, invariant 1) — never a
 * generic "relevant to the task", which is unfalsifiable and therefore
 * uncorrectable. Clipping is confessed in the same sentence: a reader who is
 * missing the last rule in CONTRIBUTING.md has to be able to see that it was
 * cut rather than absent.
 */
export function ruleItem(spec: RuleItemSpec): HouseRuleItem {
	const { file, project, because, tier, score } = spec;
	const title = heading(file.rel, spec.docTitle);
	const cut = file.clipped
		? ` Clipped to the first ${FILE_MAX} characters at a line boundary, so its tail is missing.`
		: "";
	const why = `House rule for ${project}, from ${file.rel} — ${because}${cut}`;
	return {
		id: `${HOUSE_RULES_SOURCE}:${file.rel}`,
		source: HOUSE_RULES_SOURCE,
		title,
		body: file.text,
		why,
		tokens: estimateTokens(renderedText(title, why, file.text)),
		score,
		tier,
		path: file.rel,
		trust: "untrusted",
	};
}
