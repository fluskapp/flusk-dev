/**
 * Work queues for unattended mode, read through the `gh` CLI. Pollers never
 * throw: a missing/unauthenticated gh, or a repo with no remote, yields an
 * empty queue and a note, so an overnight loop degrades instead of dying.
 */
import { spawnSync } from "node:child_process";

export interface WorkItem {
	/** Stable ledger identity: "<queue>-<id>". Attempts/cooldowns key off it. */
	key: string;
	queue: string;
	title: string;
	/** Sort key for oldest-first scheduling. */
	updatedAt: string;
	/** Branch to work from, when the item names one. */
	ref?: string;
	/** The prompt handed to the agent. */
	task: string;
}

export interface PollResult {
	items: WorkItem[];
	notes: string[];
}

function gh(repoRoot: string, args: string[]): { ok: boolean; out: string; err: string } {
	const r = spawnSync("gh", args, { cwd: repoRoot, encoding: "utf8", timeout: 60_000 });
	if (r.error !== undefined) return { ok: false, out: "", err: String(r.error) };
	return { ok: r.status === 0, out: r.stdout ?? "", err: r.stderr ?? "" };
}

function parseRows(out: string): Record<string, unknown>[] {
	try {
		const parsed: unknown = JSON.parse(out);
		return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
	} catch {
		return [];
	}
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function pollGhPrs(repoRoot: string, limit = 50, scope = ""): PollResult {
	const r = gh(repoRoot, [
		"pr",
		"list",
		"--state",
		"open",
		"--limit",
		String(limit),
		"--json",
		"number,title,updatedAt,headRefName",
	]);
	if (!r.ok) return { items: [], notes: [`gh-prs unavailable: ${r.err.trim() || "gh failed"}`] };
	const items = parseRows(r.out).map((row) => {
		const number = String(row.number ?? "");
		const title = str(row.title);
		return {
			key: `${scope}gh-prs-${number}`,
			queue: "gh-prs",
			title,
			updatedAt: str(row.updatedAt),
			...(str(row.headRefName) !== "" ? { ref: str(row.headRefName) } : {}),
			task:
				`Review pull request #${number} ("${title}") and address what it needs: ` +
				"read the diff, fix defects you find, and make the checks pass. " +
				"Do not merge or close anything.",
		} satisfies WorkItem;
	});
	return { items, notes: [] };
}

export function pollGhFailingCi(repoRoot: string, limit = 20, scope = ""): PollResult {
	const r = gh(repoRoot, [
		"run",
		"list",
		"--status",
		"failure",
		"--limit",
		String(limit),
		"--json",
		"databaseId,displayTitle,headBranch,updatedAt",
	]);
	if (!r.ok)
		return { items: [], notes: [`gh-failing-ci unavailable: ${r.err.trim() || "gh failed"}`] };
	const items = parseRows(r.out).map((row) => {
		const id = String(row.databaseId ?? "");
		const title = str(row.displayTitle);
		const branch = str(row.headBranch);
		return {
			key: `${scope}gh-failing-ci-${id}`,
			queue: "gh-failing-ci",
			title,
			updatedAt: str(row.updatedAt),
			...(branch !== "" ? { ref: branch } : {}),
			task:
				`CI run "${title}" failed on branch ${branch || "(unknown)"}. ` +
				"Reproduce the failure locally, find the root cause, and fix it.",
		} satisfies WorkItem;
	});
	return { items, notes: [] };
}

/** Poll every configured queue; oldest item first across all of them. */
export function pollQueues(repoRoot: string, queues: string[], repoSlug = ""): PollResult {
	// Ledger keys are global in the `hit` namespace, so they carry the repo:
	// otherwise PR #7 in two repos would share one cooldown and failure count.
	const scope = repoSlug === "" ? "" : `${repoSlug}/`;
	const items: WorkItem[] = [];
	const notes: string[] = [];
	for (const q of queues) {
		const r =
			q === "gh-prs"
				? pollGhPrs(repoRoot, 50, scope)
				: q === "gh-failing-ci"
					? pollGhFailingCi(repoRoot, 20, scope)
					: { items: [], notes: [`unknown queue "${q}"`] };
		items.push(...r.items);
		notes.push(...r.notes);
	}
	// A row with no id would collide with every other id-less row; a row with
	// no timestamp would outrank every real item forever.
	const usable = items.filter((i) => !i.key.endsWith("-") && i.updatedAt !== "");
	if (usable.length !== items.length) notes.push(`skipped ${items.length - usable.length} malformed row(s)`);
	usable.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
	return { items: usable, notes };
}
