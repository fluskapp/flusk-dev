/**
 * D2's headline fix at the scan level: a session whose stats entry says
 * "completed" but whose last gate entry says "blocked" reads blocked; a later
 * completed gate entry (the retry that finally passed) wins; sessions with no
 * gate entry — every pre-fix JSONL — derive status exactly as before.
 */
import { join } from "node:path";
import { afterAll, beforeAll, expect, it } from "vitest";
import { scanSessions } from "../src/features/projects/scan.repository.js";
import { Session } from "../src/features/session/session-file.repository.js";
import { session, tree, write } from "./project-fixture.js";

const MODEL = { provider: "fake", id: "fake-1", contextWindow: 200_000 };
let t: ReturnType<typeof tree>;
let repo: string;

beforeAll(() => {
	t = tree();
	repo = join(t.work, "plain");
	write(t.work, "plain/README.md", "# plain\n");
});
afterAll(() => t.cleanup());

const statusOf = (task: string): string | undefined =>
	scanSessions().find((s) => s.task === task)?.status;

it("gate-blocked no longer reads completed, whatever the stats entry says", () => {
	session({ repoRoot: repo, task: "blocked run", reason: "completed", gate: "blocked" });
	expect(statusOf("blocked run")).toBe("blocked");
});

it("the last gate entry wins: a retry that finally passes reads completed", () => {
	const sess = Session.create({ task: "retried run", repoRoot: repo, model: MODEL });
	sess.appendMessage({ role: "user", content: "retried run" });
	sess.appendDecision({ kind: "gate", outcome: "blocked", retries: 0, verified: [] });
	sess.appendDecision({ kind: "gate", outcome: "completed", retries: 1, verified: ["npm test"] });
	sess.appendStats(
		{
			turns: 1,
			usage: { input: 1, output: 1, cacheRead: 0, costUsd: 0 },
			startedAt: "2026-08-01T00:00:00.000Z",
		},
		"completed",
	);
	sess.close();
	expect(statusOf("retried run")).toBe("completed");
});

it("no gate entry: status derives exactly as before (old-JSONL degradation)", () => {
	session({ repoRoot: repo, task: "plain run", reason: "completed" });
	session({ repoRoot: repo, task: "live run", open: true });
	expect(statusOf("plain run")).toBe("completed");
	expect(statusOf("live run")).toBe("running");
});
