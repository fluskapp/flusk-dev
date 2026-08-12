/**
 * Harness run journals, as history cards.
 *
 * The stage block is the whole point. A journal's prose is boilerplate, but its
 * stages are a per-run ledger written by the harness rather than by a model:
 * `verify: "done|23.9s|all checks pass"`, `routing: "done|26.0s|→ claude
 * (claude=1.00 codex=0.75)"`, `gate: "done|78.7s|FAIL: 0 regression(s), verdict
 * block"`. Those lines carry the decision, the evidence and the refusal, so
 * they go into the card text verbatim — summarising them away would throw out
 * the only part a future run can learn from.
 *
 * The routing stage is also where the harness's `decision:` field is repeated
 * ("→ claude (claude=1.00 …)"), which is why the card does not need it
 * separately: the frozen frontmatter parser keeps stages, not arbitrary keys.
 */
import type { FluskConfig } from "../../platform/config/types.js";
import {
	type Journal,
	type JournalMeta,
	type JournalStage,
	scanJournals,
} from "../projects/journal-scan.repository.js";
import { capText } from "./cap.js";
import { redact } from "../../platform/logger/scrub.js";
import type { HistoryCard, Outcome } from "./types.js";

const TEXT_CAP = 6000;
const MAX_PATHS = 40;

/** `src/pages/CreateFilm.jsx` shaped tokens; a `.git` remote is not a file. */
const PATHISH = /\b[\w.-]+(?:\/[\w.-]+)+\.[a-z][a-z0-9]{0,5}\b/g;
const URLISH = /https?:\/\/\S+/g;

const stageLine = (s: JournalStage): string => `${s.name}: ${s.status}|${s.duration}|${s.detail}`;

/** A gate that says nothing about passing has not passed. */
const gatePassed = (s: JournalStage): boolean => /\bpass(ed|es)?\b/i.test(s.detail);

/**
 * A gate refusal is its own ending, not a failure: the harness marks the run
 * `failed`, but "the gate blocked this" is the sentence a future run needs.
 * A gate stage that itself errored, or was never reached, is not a refusal.
 */
function journalOutcome(j: JournalMeta): Outcome {
	const status = j.status.toLowerCase();
	if (status === "running" || j.stages.some((s) => s.status === "running")) return "unknown";
	const gate = j.stages.find((s) => s.name === "gate");
	if (gate && gate.status !== "pending" && gate.status !== "failed" && !gatePassed(gate)) {
		return "blocked";
	}
	if (status === "failed" || j.stages.some((s) => s.status === "failed")) return "failed";
	return status === "done" ? "shipped" : "unknown";
}

/** Files the journal names outright; URLs are stripped so hosts are not paths. */
function journalPaths(j: JournalMeta): string[] {
	const text = [j.title, ...j.stages.map((s) => s.detail)].join("\n").replace(URLISH, " ");
	const out: string[] = [];
	for (const m of text.matchAll(PATHISH)) {
		const path = m[0];
		if (path.endsWith(".git") || out.includes(path)) continue;
		out.push(path);
		if (out.length === MAX_PATHS) break;
	}
	return out;
}

function journalText(j: JournalMeta): string {
	const head = [
		j.title,
		j.kind !== undefined ? `kind: ${j.kind}` : "",
		j.tool !== undefined ? `tool: ${j.tool}` : "",
		`status: ${j.status}`,
	].filter((p) => p !== "");
	const parts = [head.join(" · "), j.stages.map(stageLine).join("\n")];
	// "pr url", not "pr": there is also a stage named `pr`, and its line stays
	// distinguishable from the link in the indexed text.
	if (j.pr !== undefined) parts.push(`pr url: ${j.pr}`);
	return capText(redact(parts.filter((p) => p !== "").join("\n\n")), TEXT_CAP);
}

function toCard(j: Journal): HistoryCard {
	return {
		id: `journal:${j.path}`,
		kind: "journal",
		project: j.harness,
		title: redact(j.title),
		text: journalText(j),
		at: j.date,
		paths: journalPaths(j),
		outcome: journalOutcome(j),
		ref: j.path,
	};
}

/** One card per journal under the configured harness dirs, newest first. */
export function journalCards(cfg: FluskConfig): HistoryCard[] {
	return scanJournals(cfg.ui.harnessDirs).map(toCard);
}
