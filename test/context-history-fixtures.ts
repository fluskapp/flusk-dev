/**
 * One corpus carrying every shape the history source has to separate: a house
 * rule that must be pinned, work that landed, a run at the same task, a
 * failure the traps are mined from, and a card from a second project that must
 * never appear. Shared so the source tests and the on-disk index test rank the
 * same material and disagree only about how it was loaded.
 */
import type { HistoryCard } from "../src/features/history/types.js";

export const PROJECT = "myrepo";
export const TASK = "add retry backoff to the watch tick hook";
const NOW = Date.parse("2026-08-01T00:00:00.000Z");
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

export function card(p: Partial<HistoryCard> & { id: string }): HistoryCard {
	return {
		kind: "commit",
		project: PROJECT,
		title: "",
		text: "",
		at: daysAgo(10),
		paths: [],
		outcome: "unknown",
		ref: p.id,
		...p,
	};
}

/**
 * A real commit body: a credential pasted into a message, and a path list of
 * the kind that once got eaten as high-entropy strings. Both claims are worth
 * asserting on the same card — the secret must go, the paths must not.
 */
export const SECRET_PATH = "base44/functions/handleUserThing.ts";
export const SECRET = "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMIK7MDENGbPxRfiCYEXAMPLEKEY";

export const CORPUS: HistoryCard[] = [
	card({
		id: "doc:myrepo:AGENTS.md",
		kind: "doc",
		ref: "AGENTS.md",
		paths: ["AGENTS.md"],
		title: "AGENTS.md",
		text: "House rules for this repo. Every retry hook is verified before it lands.",
	}),
	card({
		id: "skill:myrepo:.claude/skills/watch/SKILL.md",
		kind: "skill",
		ref: ".claude/skills/watch/SKILL.md",
		paths: [".claude/skills/watch/SKILL.md"],
		title: "watch tick conventions",
		text: "The watch tick hook takes its retry backoff from config, never a literal.",
	}),
	card({
		id: "commit:myrepo:aaaaaaaa",
		ref: "aaaaaaaa11112222",
		title: "add retry hook to watch tick",
		text: `add retry hook to watch tick\n\nbackoff on failure\n${SECRET}\n\npaths: ${SECRET_PATH}`,
		paths: ["src/watch/tick.ts", SECRET_PATH],
		outcome: "shipped",
		at: daysAgo(30),
	}),
	card({
		id: "session:myrepo/verified.jsonl",
		kind: "session",
		ref: "myrepo/verified.jsonl",
		title: "add retry backoff to watch tick",
		text: "add retry backoff to watch tick\n\ncommands:\nnpm test",
		paths: ["src/watch/tick.ts"],
		outcome: "verified",
		at: daysAgo(5),
	}),
	card({
		id: "journal:myrepo:docs/runs/2026-07-30.md",
		kind: "journal",
		ref: "docs/runs/2026-07-30.md",
		title: "retry backoff for the watch tick hook",
		text: "add retry backoff to the watch tick hook\n\ngate: FAIL: verdict block",
		paths: ["src/watch/tick.ts"],
		outcome: "blocked",
		at: daysAgo(2),
	}),
	card({
		id: "commit:myrepo:bbbbbbbb",
		ref: "bbbbbbbb33334444",
		title: "retry backoff in the watch tick hook",
		text: "retry backoff in the watch tick hook\n\nthis one was taken back",
		paths: ["src/watch/tick.ts"],
		outcome: "failed",
		at: daysAgo(4),
	}),
	card({
		id: "commit:other:cccccccc",
		project: "other",
		ref: "cccccccc55556666",
		title: "add retry backoff to the watch tick hook",
		text: "add retry backoff to the watch tick hook in a different repo",
		paths: ["src/watch/tick.ts"],
		outcome: "shipped",
		at: daysAgo(1),
	}),
];

/** A structurally broken row of the kind an older shard really can hold. */
export const MALFORMED: unknown[] = [
	{ id: "commit:myrepo:dddddddd", kind: "commit", project: PROJECT, title: "no paths field" },
	{ id: "commit:myrepo:eeeeeeee", kind: "banana", project: PROJECT, paths: [], text: "" },
	null,
];
