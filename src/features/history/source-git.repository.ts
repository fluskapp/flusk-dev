/**
 * Commits as history cards.
 *
 * Everything comes from ONE `git log`: the header fields are NUL-delimited,
 * records are separated by \x1e, and `--name-only` streams the touched paths
 * into the same output. Walking 1500 commits with a process per commit would
 * cost seconds and make the index too expensive to rebuild; the single call
 * site is `logArgs`, exported so that claim is inspectable and testable.
 *
 * OUTCOME rule (the signal that makes this more than code search):
 * - an ordinary commit is "shipped";
 * - a commit whose subject literally STARTS with a revert is "failed";
 * - and when it names what it undid ("This reverts commit <sha>",
 *   `Revert "<subject>"`), the REFERENCED commit is marked "failed" too. Work
 *   that had to be taken back is precedent NOT to copy, and it is the only
 *   card in the pair that still looks attractive to a ranker.
 *
 * Nothing else is failure. A keyword ANYWHERE in the subject used to be enough
 * — "hotfix", "rollback", "fix broken" — and on the real corpus 3 of the 8
 * failed-marked commits were ordinary fixes that shipped and were never taken
 * back. Each was demoted 0.8x AND eligible to become a cited warning telling a
 * future run not to redo work nobody had undone. A fabricated citation is
 * worse than a missed one: it is the one output a reader cannot check cheaply.
 */
import { spawnSync } from "node:child_process";
import { basename, resolve } from "node:path";
import { capText } from "./cap.js";
import { redact } from "../../platform/logger/scrub.js";
import type { HistoryCard } from "./types.js";

const DEFAULT_LIMIT = 800;
const TEXT_CAP = 1500;
const MAX_PATHS = 40;
const MAX_PATH_LEN = 200;
const REC = "\x1e";
const FORMAT = `${REC}%H%x00%aI%x00%P%x00%s%x00%b%x00`;

/** Generated or vendored trees: churn with no reusable precedent in it. */
const NOISE_DIR =
	/(^|\/)(node_modules|dist|build|out|target|coverage|vendor|third_party|\.next|\.nuxt|\.venv|venv|__pycache__|__snapshots__)\//;
const NOISE_FILE =
	/(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Cargo\.lock|poetry\.lock|Pipfile\.lock|uv\.lock|Gemfile\.lock|composer\.lock|go\.sum|flake\.lock)$/;
const NOISE_EXT =
	/\.(min\.(js|css)|bundle\.js|map|png|jpe?g|gif|webp|ico|svg|pdf|zip|gz|tgz|woff2?|ttf|eot|mp4|mov|wasm|so|dylib|dll|exe|jar|class|pyc|snap)$/i;

/**
 * "feat: add undo button" ships an undo FEATURE and "fix broken sessions in
 * the agents view" is a fix that shipped; neither is an event that had to be
 * taken back. Only a subject that OPENS with a revert says so about itself.
 */
const REVERT_SUBJECT = /^revert\b|^\w+(\([^)]*\))?!?:\s*revert\b/i;

function isFailure(subject: string): boolean {
	return REVERT_SUBJECT.test(subject.trim());
}
const REF_SHA = /\brevert(?:s|ed)?\s+(?:commit\s+)?([0-9a-f]{7,40})\b/gi;
const REF_SUBJECT = /\brevert(?:s|ed)?:?\s+"([^"\n]+)"/gi;

export interface GitCardOpts {
	limit?: number;
	/** Anything `git log --since` accepts, e.g. "6 months ago". */
	since?: string;
}

/** The one and only git invocation this module makes. */
export function logArgs(limit: number, since?: string): string[] {
	const args = ["log", `--max-count=${limit}`, `--format=${FORMAT}`, "--name-only"];
	if (since !== undefined && since !== "") args.push(`--since=${since}`);
	return args;
}

const isNoise = (p: string): boolean =>
	p.length > MAX_PATH_LEN || NOISE_DIR.test(p) || NOISE_FILE.test(p) || NOISE_EXT.test(p);

const normalize = (s: string): string => s.trim().toLowerCase();

function toCard(record: string, project: string, refs: string[]): HistoryCard | null {
	const f = record.split("\0");
	const [sha = "", at = "", parents = "", subject = "", body = "", pathBlob = ""] = f;
	if (f.length < 6 || sha === "" || subject === "") return null;
	// A merge whose message is only "Merge branch …" carries no lesson; a merge
	// that kept its PR body does, so it stays.
	if (parents.trim().split(" ").length > 1 && body.trim() === "") return null;
	const raw = pathBlob.split("\n").filter((p) => p.trim() !== "");
	const paths = raw.filter((p) => !isNoise(p)).slice(0, MAX_PATHS);
	if (paths.length === 0 && raw.length > 0) return null; // pure-noise commit
	const failed = isFailure(subject);
	// Unconditional: a commit that is not itself a revert can still SAY what it
	// undid ("This reverts commit <sha>"), and that target is the failed card.
	collectRefs(`${subject}\n${body}`, refs);
	return {
		id: `commit:${project}:${sha.slice(0, 8)}`,
		kind: "commit",
		project,
		title: redact(subject),
		text: capText(redact(`${subject}\n\n${body}\n\n${paths.join("\n")}`.trim()), TEXT_CAP),
		at,
		paths,
		outcome: failed ? "failed" : "shipped",
		ref: sha,
	};
}

/** Whatever a failing commit says it undid: a sha, or a quoted subject. */
function collectRefs(message: string, refs: string[]): void {
	for (const m of message.matchAll(REF_SHA)) if (m[1]) refs.push(m[1]);
	for (const m of message.matchAll(REF_SUBJECT)) if (m[1]) refs.push(m[1]);
}

/** Second pass: a commit that had to be reverted is itself failed precedent. */
function markReverted(cards: HistoryCard[], refs: string[]): void {
	for (const ref of refs) {
		const subject = normalize(ref);
		for (const card of cards) {
			if (card.outcome === "failed") continue;
			if (card.ref.startsWith(ref) || normalize(card.title) === subject) {
				card.outcome = "failed";
				break;
			}
		}
	}
}

/** Cards for a repo's commits, newest first. A non-git directory yields []. */
export function gitCards(repoRoot: string, opts: GitCardOpts = {}): HistoryCard[] {
	const limit = Math.max(0, Math.trunc(opts.limit ?? DEFAULT_LIMIT));
	if (limit === 0) return [];
	let stdout = "";
	try {
		const res = spawnSync("git", logArgs(limit, opts.since), {
			cwd: repoRoot,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		});
		if (res.error || res.status !== 0) return []; // not a repo, no git, empty history
		stdout = res.stdout ?? "";
	} catch {
		return [];
	}
	const project = basename(resolve(repoRoot)) || repoRoot;
	const refs: string[] = [];
	const cards: HistoryCard[] = [];
	for (const record of stdout.split(REC).slice(1)) {
		const card = toCard(record, project, refs);
		if (card !== null) cards.push(card);
	}
	markReverted(cards, refs);
	return cards;
}
