/**
 * ah's own runs, as history cards.
 *
 * A session is the richest card in the corpus: it holds the task as it was
 * actually phrased, the closing report, every command the agent ran and every
 * file it wrote. What makes it *ranking* signal rather than another transcript
 * is the ending — and the ending is easy to overclaim.
 *
 * So "verified" is deliberately expensive to earn: the run must have ended
 * `completed`, the stats entry must say so explicitly (an older file that omits
 * the reason can never qualify), AND the transcript must show a verification
 * command that actually exited zero AFTER the last edit it is supposed to
 * cover. Everything short of that is "shipped". A false "verified" tells a
 * future run to copy work nobody checked — a baseline `npm test` run before
 * any edits is the commonest way to earn one by accident.
 */
import { basename, join, resolve } from "node:path";
import { loadSessionDetail, type ToolView, type TranscriptItem } from "../ui/detail.js";
import { type SessionStatus, scanSessions, sessionsRoot } from "../ui/scan.js";
import { capText } from "./cap.js";
import { redact } from "./scrub.js";
import type { HistoryCard, Outcome } from "./types.js";
import { isVerifyCommand } from "./verify-evidence.js";

const TEXT_CAP = 4000;
const REPORT_CAP = 1500;
const MAX_COMMANDS = 40;
const MAX_PATHS = 60;

/** Verbatim shapes of a policy refusal (src/safety/ah-policy.ts). */
const POLICY_DENIAL = /^denied: |denied while unattended/;

/** The bash tool appends this tail instead of erroring on a non-zero exit. */
const NONZERO_EXIT = /\[exit code \d+\]\s*$/;

interface Facts {
	commands: string[];
	paths: string[];
	report: string;
	verifyPassed: boolean;
	denied: boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** A tool call that never returned proves nothing — `output` is then null. */
function succeeded(t: ToolView): boolean {
	return !t.isError && t.output !== null && !NONZERO_EXIT.test(t.output);
}

/** Repo-relative where possible: that is what a task naming a file will say. */
function relPath(repoRoot: string, p: string): string {
	const root = resolve(repoRoot);
	const abs = resolve(root, p);
	return abs.startsWith(`${root}/`) ? abs.slice(root.length + 1) : abs;
}

function collect(items: TranscriptItem[], repoRoot: string): Facts {
	const f: Facts = { commands: [], paths: [], report: "", verifyPassed: false, denied: false };
	// Order is the whole claim: a green run BEFORE the edits verified the old
	// tree. Only a passing verification after the last successful write counts.
	let step = 0;
	let lastWrite = -1;
	let lastVerify = -1;
	for (const item of items) {
		if (item.kind !== "assistant") continue;
		if (item.text.trim() !== "") f.report = item.text.trim(); // last one wins
		for (const t of item.tools) {
			step++;
			if (t.isError && POLICY_DENIAL.test(t.output ?? "")) f.denied = true;
			const args = isObj(t.args) ? t.args : {};
			if (t.name === "bash" && typeof args.command === "string") {
				f.commands.push(args.command);
				if (isVerifyCommand(args.command) && succeeded(t)) lastVerify = step;
			} else if (t.name === "write" || t.name === "edit") {
				if (!succeeded(t) || typeof args.file_path !== "string") continue;
				lastWrite = step;
				const rel = relPath(repoRoot, args.file_path);
				if (!f.paths.includes(rel)) f.paths.push(rel);
			}
		}
	}
	f.verifyPassed = lastVerify > lastWrite;
	return f;
}

/**
 * "blocked" is for a run stopped from outside — aborted, or refused by the
 * policy — as opposed to one that broke or ran out of road ("failed").
 */
function sessionOutcome(status: SessionStatus, reasonCompleted: boolean, f: Facts): Outcome {
	if (status === "running") return "unknown";
	if (status === "completed") return reasonCompleted && f.verifyPassed ? "verified" : "shipped";
	if (status === "aborted" || f.denied) return "blocked";
	return "failed"; // error, budget, maxTurns, deadline
}

function cardText(task: string, f: Facts): string {
	const parts = [task, f.report.slice(0, REPORT_CAP)];
	if (f.commands.length > 0)
		parts.push(`commands:\n${f.commands.slice(0, MAX_COMMANDS).join("\n")}`);
	if (f.paths.length > 0) parts.push(`files:\n${f.paths.slice(0, MAX_PATHS).join("\n")}`);
	return capText(redact(parts.filter((p) => p !== "").join("\n\n")), TEXT_CAP);
}

/** One card per ah session, newest first (the order `scanSessions` returns). */
export function sessionCards(): HistoryCard[] {
	const cards: HistoryCard[] = [];
	for (const s of scanSessions()) {
		const path = join(sessionsRoot(), s.key);
		let facts: Facts;
		// One parse per session: `detail` already carries the RunEndReason the
		// "verified" rule needs, so re-reading the JSONL for it doubled the cost.
		let completed = false;
		try {
			const detail = loadSessionDetail(path);
			facts = collect(detail.items, s.repoRoot);
			completed = detail.reason === "completed";
		} catch {
			continue; // unreadable transcript: no card beats a wrong one
		}
		cards.push({
			id: `session:${s.key}`,
			kind: "session",
			project: basename(resolve(s.repoRoot)) || s.repoRoot,
			title: redact(s.task),
			text: cardText(s.task, facts),
			at: s.createdAt,
			paths: facts.paths.slice(0, MAX_PATHS),
			outcome: sessionOutcome(s.status, s.status === "completed" && completed, facts),
			ref: s.key,
		});
	}
	return cards;
}
